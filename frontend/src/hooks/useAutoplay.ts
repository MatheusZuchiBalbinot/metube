import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoUrl } from '@utils';
import type { Video } from '@models';

const AUTOPLAY_COUNTDOWN = 5;

interface UseAutoplayOptions {
    id: string | undefined
    autoplay: boolean
    relatedVideos: Video[]
}

export function useAutoplay({ id, autoplay, relatedVideos }: UseAutoplayOptions) {
    const navigate = useNavigate();
    const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
    const [stopAfterCurrent, setStopAfterCurrent] = useState(false);
    const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function cancelAutoplay() {
        setAutoplayCountdown(null);
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
        }
    }

    function toggleStopAfterCurrent() {
        setStopAfterCurrent(prev => !prev);
    }

    function startAutoplayCountdown() {
        const hasRelated = relatedVideos.length > 0;
        if (!autoplay || !hasRelated || stopAfterCurrent) {
            return;
        }
        setAutoplayCountdown(AUTOPLAY_COUNTDOWN);
    }

    // Reset per-video state when navigating to a different video
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset of per-video state when the id changes
        setStopAfterCurrent(false);
        return () => cancelAutoplay();

    }, [id]);

    // Drive the countdown timer
    useEffect(() => {
        const isCountingDown = autoplayCountdown !== null;
        if (!isCountingDown) {
            return;
        }

        autoplayTimerRef.current = setInterval(() => {
            setAutoplayCountdown(prev => {
                const isAtZero = prev !== null && prev <= 1;
                if (isAtZero) {
                    clearInterval(autoplayTimerRef.current!);
                    autoplayTimerRef.current = null;
                    const nextVideo = relatedVideos[0];
                    if (nextVideo) {
                        navigate(videoUrl(nextVideo.id));
                    }
                    return null;
                }
                return prev !== null ? prev - 1 : null;
            });
        }, 1000);

        return () => {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoplayCountdown]);

    return { autoplayCountdown, startAutoplayCountdown, cancelAutoplay, stopAfterCurrent, toggleStopAfterCurrent };
}
