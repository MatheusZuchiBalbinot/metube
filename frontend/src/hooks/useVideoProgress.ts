import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import type { Video } from '@data/mockVideos';
import type { VideoId } from '@models/video';

const PROGRESS_THROTTLE_MS = 3000;
const SIMULATE_DURATION_S = 60;
const SIMULATE_TICK_MS = 2000;

interface UseVideoProgressOptions {
    id: string | undefined
    videoRef: React.RefObject<HTMLVideoElement | null>
    video: Video | undefined
    videoProgress: Record<string, number>
    updateProgress: (id: string, pct: number) => void
    consumePendingVideoSeek: (id: string) => number | null
    onCompleted: () => void
}

export function useVideoProgress({
    id,
    videoRef,
    video,
    videoProgress,
    updateProgress,
    consumePendingVideoSeek,
    onCompleted,
}: UseVideoProgressOptions) {
    const dispatch = useAppDispatch();

    const progressThrottleRef = useRef<number>(0);
    const pendingSeekRef = useRef<number | null>(null);
    const simulatedSecondsRef = useRef<number>(0);
    const simulateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const hasCompletedRef = useRef(false);

    const onCompletedRef = useRef(onCompleted);
    onCompletedRef.current = onCompleted;

    const [currentTime, setCurrentTime] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);

    // Reset completion flag when video id changes
    useEffect(() => {
        hasCompletedRef.current = false;
    }, [id]);

    // Consume a pending resume-seek when id changes
    useEffect(() => {
        if (!id) {
            return;
        }
        const resumeTime = consumePendingVideoSeek(id);
        if (resumeTime !== null) {
            pendingSeekRef.current = resumeTime;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    function triggerCompletion() {
        const isAlreadyCompleted = hasCompletedRef.current;
        if (isAlreadyCompleted) {
            return;
        }
        hasCompletedRef.current = true;
        setShowCompletion(true);
        setTimeout(() => setShowCompletion(false), 1800);
    }

    // Simulate progress for videos without a real file
    useEffect(() => {
        const isVideoMissing = !video || !id;
        if (isVideoMissing) {
            return;
        }

        const hasFile = video.videoUrl !== undefined && video.videoUrl !== '';
        if (hasFile) {
            return;
        }

        const existing = videoProgress[id] ?? 0;
        const isFinished = existing >= 95;
        if (isFinished) {
            return;
        }

        // Start at least 4s in so the mini player always triggers on navigate-away
        simulatedSecondsRef.current = Math.max(4, (existing / 100) * SIMULATE_DURATION_S);

        simulateTimerRef.current = setInterval(() => {
            simulatedSecondsRef.current += SIMULATE_TICK_MS / 1000;
            const pct = Math.min((simulatedSecondsRef.current / SIMULATE_DURATION_S) * 100, 100);
            setCurrentTime(simulatedSecondsRef.current);
            updateProgress(id, pct);

            const isVideoFinished = pct >= 100;
            if (isVideoFinished) {
                clearInterval(simulateTimerRef.current!);
                simulateTimerRef.current = null;
                triggerCompletion();
                onCompletedRef.current();
            }
        }, SIMULATE_TICK_MS);

        return () => {
            if (simulateTimerRef.current) {
                clearInterval(simulateTimerRef.current);
                simulateTimerRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, !!video]);

    // Persist progress and open mini player on unmount / id change
    useEffect(() => {
        return () => {
            if (simulateTimerRef.current) {
                clearInterval(simulateTimerRef.current);
            }

            if (!id) {
                return;
            }

            const hasCurrentTime = currentTimeRef.current > 0;
            const currentT = hasCurrentTime ? currentTimeRef.current : simulatedSecondsRef.current;
            const hasDuration = durationRef.current > 0;
            const hasVideoEnded = hasDuration && currentT >= durationRef.current;

            if (!hasVideoEnded) {
                const videoId = id as unknown as VideoId;
                dispatch(videoActions.setPendingVideoSeek({ videoId, time: currentT }));
                dispatch(videoActions.openMiniPlayer({ videoId, currentTime: currentT }));

                const hasRealProgress = hasCurrentTime && hasDuration;
                if (hasRealProgress) {
                    const percent = (currentTimeRef.current / durationRef.current) * 100;
                    dispatch(videoActions.updateProgress({ videoId, percent }));
                } else if (!hasCurrentTime && simulatedSecondsRef.current > 0) {
                    const simPct = (simulatedSecondsRef.current / SIMULATE_DURATION_S) * 100;
                    const isSimFinished = simPct >= 100;
                    if (!isSimFinished) {
                        dispatch(videoActions.updateProgress({ videoId, percent: simPct }));
                    }
                }
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleLoadedMetadata = useCallback(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }

        durationRef.current = el.duration;

        const hasPendingSeek = pendingSeekRef.current !== null;
        if (hasPendingSeek) {
            el.currentTime = pendingSeekRef.current!;
            pendingSeekRef.current = null;
            el.play().catch(() => { });
        }

        currentTimeRef.current = el.currentTime;
    }, [videoRef]);

    const handleTimeUpdate = useCallback(() => {
        const el = videoRef.current;
        if (!el || !id) {
            return;
        }

        currentTimeRef.current = el.currentTime;
        setCurrentTime(el.currentTime);

        const now = Date.now();
        const shouldThrottle = now - progressThrottleRef.current < PROGRESS_THROTTLE_MS;
        if (shouldThrottle) {
            return;
        }

        progressThrottleRef.current = now;
        const percent = el.duration > 0 ? (el.currentTime / el.duration) * 100 : 0;
        updateProgress(id, percent);
    }, [id, updateProgress, videoRef]);

    const handleVideoEnded = useCallback(() => {
        if (id) {
            updateProgress(id, 100);
        }
        triggerCompletion();
        onCompletedRef.current();

    }, [id, updateProgress]);

    // Returns the best-known current playback position (real or simulated)
    function getCurrentTime(): number {
        return currentTimeRef.current || simulatedSecondsRef.current;
    }

    return {
        currentTime,
        showCompletion,
        handleLoadedMetadata,
        handleTimeUpdate,
        handleVideoEnded,
        getCurrentTime,
    };
}
