import { useEffect, useRef, useState } from 'react';

const HOLD_SPEED_DELAY_MS = 350;
export const HOLD_SPEED_RATE = 2;

interface UsePlayerHoldSpeedResult {
    holdSpeedActive: boolean
    handleSurfacePointerDown: (e: React.PointerEvent) => void
    handleSurfacePointerEnd: () => void
    handleSurfaceClick: () => void
}

/**
 * Press-and-hold anywhere on the video surface to temporarily play at 2×.
 * Releasing restores the previous rate and swallows the trailing click so the
 * hold doesn't also toggle playback. Clicks outside a hold fall through to `onClick`.
 */
export function usePlayerHoldSpeed(
    playbackRate: number,
    applyPlaybackRate: (rate: number) => void,
    onClick: () => void,
): UsePlayerHoldSpeedResult {
    const [holdSpeedActive, setHoldSpeedActive] = useState(false);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdPrevRateRef = useRef(1);
    const suppressClickRef = useRef(false);

    // Clear a pending hold timer on unmount so it can't fire after teardown.
    useEffect(() => () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
        }
    }, []);

    function handleSurfacePointerDown(e: React.PointerEvent) {
        const isPrimary = e.button === 0;
        const isOnControls = (e.target as HTMLElement).closest('.vp__controls') !== null;

        if (!isPrimary || isOnControls) {
            return;
        }

        holdTimerRef.current = setTimeout(() => {
            holdPrevRateRef.current = playbackRate;
            setHoldSpeedActive(true);
            applyPlaybackRate(HOLD_SPEED_RATE);
        }, HOLD_SPEED_DELAY_MS);
    }

    function handleSurfacePointerEnd() {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }

        if (!holdSpeedActive) {
            return;
        }

        applyPlaybackRate(holdPrevRateRef.current);
        setHoldSpeedActive(false);
        // A click event fires right after the hold ends — swallow it so playback
        // doesn't toggle.
        suppressClickRef.current = true;
    }

    function handleSurfaceClick() {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }

        onClick();
    }

    return { holdSpeedActive, handleSurfacePointerDown, handleSurfacePointerEnd, handleSurfaceClick };
}
