import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Pins the watch-page player to a corner once it scrolls out of view, so playback
 * stays visible while the viewer reads comments. A sentinel above the player drives
 * an IntersectionObserver; the reserved height keeps the page from jumping when the
 * player leaves the normal flow.
 */
export function usePinnedPlayer(enabled: boolean) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const dismissedRef = useRef(false);
    const [pinned, setPinned] = useState(false);
    const [reservedHeight, setReservedHeight] = useState(0);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const sentinel = sentinelRef.current;
        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                dismissedRef.current = false;
                setPinned(false);
                return;
            }

            const isScrolledAbove = entry.boundingClientRect.top < 0;
            if (!isScrolledAbove || dismissedRef.current) {
                return;
            }

            const height = wrapRef.current?.offsetHeight ?? 0;
            if (height > 0) {
                setReservedHeight(height);
            }
            setPinned(true);
        }, { threshold: 0 });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [enabled]);

    const unpin = useCallback(() => {
        dismissedRef.current = true;
        setPinned(false);
    }, []);

    return { sentinelRef, wrapRef, pinned: pinned && enabled, reservedHeight, unpin };
}
