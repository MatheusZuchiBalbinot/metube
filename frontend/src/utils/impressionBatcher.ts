import { analytics, type AnalyticsSource } from '@api';
import type { Vuid } from '@api';
import { getSessionId } from './sessionId';

const FLUSH_DELAY_MS = 1000;
const MAX_BATCH = 50;

interface PendingBatch {
    vuids: Set<Vuid>
    source: AnalyticsSource
}

const pendingBySource = new Map<AnalyticsSource, PendingBatch>();
const reportedKeys = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
    flushTimer = null;

    if (pendingBySource.size === 0) {
        /* v8 ignore next */
        return;
    }

    const batches = Array.from(pendingBySource.values());
    pendingBySource.clear();

    for (const batch of batches) {
        if (batch.vuids.size === 0) {
            /* v8 ignore next */
            continue;
        }

        analytics.impressions({
            vuids: Array.from(batch.vuids),
            source: batch.source,
            sessionId: getSessionId(),
        }).catch(() => {});
    }
}

function scheduleFlush(): void {
    if (flushTimer !== null) {
        return;
    }
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

export function reportImpression(vuid: Vuid, source: AnalyticsSource): void {
    const dedupKey = `${source}:${vuid}`;

    if (reportedKeys.has(dedupKey)) {
        return;
    }

    reportedKeys.add(dedupKey);

    let batch = pendingBySource.get(source);

    if (batch === undefined) {
        batch = { vuids: new Set(), source };
        pendingBySource.set(source, batch);
    }

    batch.vuids.add(vuid);

    const shouldFlushNow = batch.vuids.size >= MAX_BATCH;

    if (shouldFlushNow) {
        if (flushTimer !== null) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
        flush();
        return;
    }

    scheduleFlush();
}

export function resetImpressionBatcher(): void {
    if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    pendingBySource.clear();
    reportedKeys.clear();
}
