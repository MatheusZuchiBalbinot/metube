import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { video } from '@api/videos';
import type { Vuid } from '@api/videos';
import { VideoStatus } from '@models/video';

const POLL_INITIAL_MS = 3_000;
const POLL_SLOW_MS = 5_000;
const POLL_SLOW_AFTER_MS = 30_000;
const POLL_STOP_AFTER_MS = 5 * 60 * 1_000;

export function useVideoProcessingPoll(vuid: Vuid | null): void {
    const dispatch = useAppDispatch();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startRef = useRef<number>(0);

    useEffect(() => {
        if (vuid === null) {
            return;
        }

        startRef.current = Date.now();

        function clearTimer(): void {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }

        async function poll(): Promise<void> {
            const elapsed = Date.now() - startRef.current;
            const hasTimedOut = elapsed >= POLL_STOP_AFTER_MS;

            if (hasTimedOut) {
                return;
            }

            const result = await video.get(vuid as Vuid);

            if (result === null) {
                return;
            }

            dispatch(videoActions.updateVideo(result));

            const isStillProcessing = result.status === VideoStatus.PROCESSING;

            if (!isStillProcessing) {
                return;
            }

            const isSlow = elapsed >= POLL_SLOW_AFTER_MS;
            const delay = isSlow ? POLL_SLOW_MS : POLL_INITIAL_MS;
            timerRef.current = setTimeout(poll, delay);
        }

        timerRef.current = setTimeout(poll, POLL_INITIAL_MS);

        return clearTimer;
    }, [vuid, dispatch]);
}
