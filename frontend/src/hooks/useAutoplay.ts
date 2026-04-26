import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoUrl } from '@utils/routes';
import type { Video } from '@data/mockVideos';

const AUTOPLAY_COUNTDOWN = 5;

interface UseAutoplayOptions {
    id: string | undefined
    autoplay: boolean
    relatedVideos: Video[]
}

export function useAutoplay({ id, autoplay, relatedVideos }: UseAutoplayOptions) {
    const navigate = useNavigate();
    const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
    const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function cancelAutoplay() {
        setAutoplayCountdown(null);
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
        }
    }

    function startAutoplayCountdown() {
        const hasRelated = relatedVideos.length > 0;
        if (!autoplay || !hasRelated) {
            return;
        }
        setAutoplayCountdown(AUTOPLAY_COUNTDOWN);
    }

    // Cancel autoplay when navigating to a different video
    useEffect(() => {
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

    return { autoplayCountdown, startAutoplayCountdown, cancelAutoplay };
}
