import { useState, useRef, useCallback } from 'react';

const HIDE_CONTROLS_DELAY_MS = 3000;

export function usePlayerControls(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [showControls, setShowControls] = useState(true);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelHide = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
    }, []);

    const scheduleHideControls = useCallback(() => {
        cancelHide();
        hideTimerRef.current = setTimeout(() => {
            const isVideoPaused = videoRef.current?.paused ?? true;
            if (!isVideoPaused) {
                setShowControls(false);
            }
        }, HIDE_CONTROLS_DELAY_MS);
    }, [cancelHide, videoRef]);

    const revealControls = useCallback(() => {
        setShowControls(true);
        scheduleHideControls();
    }, [scheduleHideControls]);

    const forceShow = useCallback(() => {
        setShowControls(true);
        cancelHide();
    }, [cancelHide]);

    return { showControls, setShowControls, scheduleHideControls, revealControls, forceShow, cancelHide };
}
