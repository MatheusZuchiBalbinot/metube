import { useEffect, useRef } from 'react';
import { analytics, toVuid } from '@api';
import type { Vuid } from '@api';

export function useSkipAnalytics(id: string | undefined, percent: number): void {
    const skipTrackerRef = useRef<{ vuid: Vuid; percent: number } | null>(null);

    useEffect(() => {
        if (id === undefined) {
            return;
        }

        const vuid = toVuid(id);
        skipTrackerRef.current = { vuid, percent: 0 };

        return () => {
            const tracker = skipTrackerRef.current;
            skipTrackerRef.current = null;

            if (tracker === null) {
                return;
            }

            const isEarlyAbandon = tracker.percent > 0 && tracker.percent < 10;

            if (!isEarlyAbandon) {
                return;
            }

            analytics.skip({ vuid: tracker.vuid, percent: tracker.percent }).catch(() => { });
        };
    }, [id]);

    useEffect(() => {
        if (skipTrackerRef.current === null) {
            return;
        }

        skipTrackerRef.current.percent = percent;
    }, [percent]);
}
