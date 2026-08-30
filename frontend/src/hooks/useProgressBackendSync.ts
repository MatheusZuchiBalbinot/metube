import { useEffect, useLayoutEffect, useRef } from 'react';
import type { VideoId } from '@models';

const BACKEND_SYNC_INTERVAL_MS = 5000;

interface UseProgressBackendSyncOptions {
    id: VideoId | undefined
    readProgress: () => { seconds: number; percent: number }
    onBackendSync?: (id: VideoId, percent: number) => void
}

/**
 * Periodically pushes the current playback percent to the backend, independent
 * of the local throttle used for Redux updates. Ticks every BACKEND_SYNC_INTERVAL_MS
 * while a video id is active and skips ticks with no real progress yet.
 */
export function useProgressBackendSync({ id, readProgress, onBackendSync }: UseProgressBackendSyncOptions) {
    const readProgressRef = useRef(readProgress);
    const onBackendSyncRef = useRef(onBackendSync);
    useLayoutEffect(() => {
        readProgressRef.current = readProgress;
        onBackendSyncRef.current = onBackendSync;
    });

    useEffect(() => {
        if (!id) {
            return;
        }

        const timer = setInterval(() => {
            const { seconds, percent } = readProgressRef.current();
            const hasProgress = seconds > 0 && percent > 0;

            if (hasProgress) {
                onBackendSyncRef.current?.(id, Math.round(percent));
            }
        }, BACKEND_SYNC_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [id]);
}
