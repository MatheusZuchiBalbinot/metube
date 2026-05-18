import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { video } from '@api/videos';
import type { Vuid } from '@api/videos';
import { VideoStatus } from '@models/video';

const POLL_INITIAL_MS = 3_000;
const POLL_SLOW_MS = 5_000;
const POLL_SLOW_AFTER_MS = 30_000;
const POLL_STOP_AFTER_MS = 5 * 60 * 1_000;

interface PollEntry {
    timer: ReturnType<typeof setTimeout> | null
    startedAt: number
}

/**
 * Poll one or more videos in PROCESSING state until each transitions to a
 * terminal status. Dispatches a toast on every status transition so the user
 * gets feedback even when the Reverb WebSocket is unavailable.
 *
 * Pass a single vuid (legacy single-upload flow) or an array (batch flow).
 */
export function useVideoProcessingPoll(vuids: Vuid | Vuid[] | null): void {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const entriesRef = useRef<Map<string, PollEntry>>(new Map());

    function normalize(): Vuid[] {
        if (vuids === null) {
            return [];
        }

        if (Array.isArray(vuids)) {
            return vuids;
        }

        return [vuids];
    }

    const list = normalize();
    const key = list.join(',');

    useEffect(() => {
        const entries = entriesRef.current;

        function clearEntry(vuid: string): void {
            const entry = entries.get(vuid);
            const hasTimer = entry !== undefined && entry.timer !== null;
            if (hasTimer) {
                clearTimeout(entry.timer!);
            }
            entries.delete(vuid);
        }

        async function pollOne(vuid: Vuid): Promise<void> {
            const entry = entries.get(vuid);
            if (entry === undefined) {
                return;
            }

            const elapsed = Date.now() - entry.startedAt;
            const hasTimedOut = elapsed >= POLL_STOP_AFTER_MS;
            if (hasTimedOut) {
                clearEntry(vuid);
                return;
            }

            const result = await video.get(vuid);

            if (result === null) {
                clearEntry(vuid);
                return;
            }

            dispatch(videoActions.updateVideo(result));

            const isStillProcessing = result.status === VideoStatus.PROCESSING;
            if (!isStillProcessing) {
                dispatch(videoActions.updateVideoStatus({ vuid, status: result.status }));
                clearEntry(vuid);
                return;
            }

            const isSlow = elapsed >= POLL_SLOW_AFTER_MS;
            const delay = isSlow ? POLL_SLOW_MS : POLL_INITIAL_MS;
            entry.timer = setTimeout(() => {
                void pollOne(vuid);
            }, delay);
        }

        for (const vuid of list) {
            const alreadyTracked = entries.has(vuid);
            if (alreadyTracked) {
                continue;
            }
            const entry: PollEntry = { timer: null, startedAt: Date.now() };
            entries.set(vuid, entry);
            entry.timer = setTimeout(() => {
                void pollOne(vuid);
            }, POLL_INITIAL_MS);
        }

        const incomingSet = new Set<string>(list);
        for (const tracked of Array.from(entries.keys())) {
            const isStillRequested = incomingSet.has(tracked);
            if (!isStillRequested) {
                clearEntry(tracked);
            }
        }

    }, [key, dispatch, t]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const entries = entriesRef.current;
        return () => {
            for (const entry of entries.values()) {
                if (entry.timer !== null) {
                    clearTimeout(entry.timer);
                }
            }
            entries.clear();
        };
    }, []);
}
