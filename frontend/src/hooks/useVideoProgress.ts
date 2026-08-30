import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { videoUiActions } from '@store/videoUiSlice';
import type { VideoId } from '@models';
import { useProgressBackendSync } from './useProgressBackendSync';

const PROGRESS_THROTTLE_MS = 3000;
const COMPLETION_DISPLAY_MS = 1800;

interface UseVideoProgressOptions {
    id: VideoId | undefined
    videoRef: React.RefObject<HTMLVideoElement | null>
    updateProgress: (id: VideoId, pct: number) => void
    onBackendSync?: (id: VideoId, percent: number) => void
    consumePendingVideoSeek: (id: VideoId) => number | null
    onCompleted: () => void
    onFinished?: (id: VideoId) => void
}

export function useVideoProgress({
    id,
    videoRef,
    updateProgress,
    onBackendSync,
    consumePendingVideoSeek,
    onCompleted,
    onFinished,
}: UseVideoProgressOptions) {
    const dispatch = useAppDispatch();

    const progressThrottleRef = useRef<number>(0);
    const pendingSeekRef = useRef<number | null>(null);
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const hasCompletedRef = useRef(false);
    const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onCompletedRef = useRef(onCompleted);
    const onBackendSyncRef = useRef(onBackendSync);
    useLayoutEffect(() => {
        onCompletedRef.current = onCompleted;
        onBackendSyncRef.current = onBackendSync;
    });

    const [currentTime, setCurrentTime] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);

    // Single source of truth for "how far along is playback" — every consumer
    // below (backend sync, Redux persistence, getCurrentTime) reads through
    // this instead of re-deriving seconds/percent from the refs itself.
    function readProgress(): { seconds: number; percent: number } {
        const seconds = currentTimeRef.current;
        const duration = durationRef.current;
        const percent = duration > 0 ? (seconds / duration) * 100 : 0;

        return { seconds, percent };
    }

    useEffect(() => {
        hasCompletedRef.current = false;
    }, [id]);

    useEffect(() => {
        if (!id) {
            return;
        }
        const resumeTime = consumePendingVideoSeek(id);
        if (resumeTime !== null) {
            pendingSeekRef.current = resumeTime;
        }
    // consumePendingVideoSeek is a fresh closure from useVideo() on every render;
    // depending on it would re-run this seek-consumption effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    function triggerCompletion() {
        const isAlreadyCompleted = hasCompletedRef.current;
        if (isAlreadyCompleted) {
            return;
        }
        hasCompletedRef.current = true;
        setShowCompletion(true);
        completionTimerRef.current = setTimeout(() => setShowCompletion(false), COMPLETION_DISPLAY_MS);
    }

    // Clear the completion banner timer on unmount so it never calls setState
    // after the component is gone.
    useEffect(() => () => {
        if (completionTimerRef.current) {
            clearTimeout(completionTimerRef.current);
        }
    }, []);

    // Sync progress to backend every 5 seconds, independent of the local throttle
    useProgressBackendSync({ id, readProgress, onBackendSync });

    // Persist progress and open mini player on unmount / id change
    function updateProgressDispatch(videoId: VideoId) {
        const { seconds, percent } = readProgress();
        const hasRealProgress = seconds > 0 && durationRef.current > 0;
        if (hasRealProgress) {
            dispatch(videoActions.updateProgress({ videoId, percent }));
        }
    }

    function persistProgressOnUnmount() {
        if (!id) {
            return;
        }

        const videoId = id;
        const { seconds } = readProgress();
        const hasVideoEnded = durationRef.current > 0 && seconds >= durationRef.current;

        if (hasVideoEnded) {
            return;
        }

        dispatch(videoUiActions.setPendingVideoSeek({ videoId, time: seconds }));
        dispatch(videoUiActions.openMiniPlayer({ videoId, currentTime: seconds }));
        updateProgressDispatch(videoId);
    }

    useEffect(() => {
        return () => {
            persistProgressOnUnmount();
        };
    // persistProgressOnUnmount reads refs (currentTimeRef, durationRef) at the
    // moment of unmount, not stale closure values — it intentionally only needs
    // to re-register when the video id itself changes.
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
        durationRef.current = el.duration;
        setCurrentTime(el.currentTime);

        const now = Date.now();
        const shouldThrottle = now - progressThrottleRef.current < PROGRESS_THROTTLE_MS;
        if (shouldThrottle) {
            return;
        }

        progressThrottleRef.current = now;
        const { percent } = readProgress();
        updateProgress(id, percent);
    }, [id, updateProgress, videoRef]);

    const handleVideoEnded = useCallback(() => {
        if (id) {
            updateProgress(id, 100);
            onBackendSyncRef.current?.(id, 100);
            dispatch(videoActions.videoFinished(id));
            onFinished?.(id);
        }
        triggerCompletion();
        onCompletedRef.current();

    }, [id, updateProgress, dispatch, onFinished]);

    function getCurrentTime(): number {
        return readProgress().seconds;
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
