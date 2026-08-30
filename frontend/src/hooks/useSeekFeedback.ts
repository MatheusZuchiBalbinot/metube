import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks which item (by index) is mid-seek so the UI can show a spinner in its
 * place, clearing it once `videoRef`'s element reports the seek completed
 * (`seeked`). Adds/removes the listener itself — including on unmount — so a
 * seek triggered right before the component goes away can't leak a listener.
 */
export function useSeekFeedback(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [seekingIndex, setSeekingIndex] = useState<number | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        return () => {
            cleanupRef.current?.();
            cleanupRef.current = null;
        };
    }, []);

    const seekToIndex = useCallback((index: number, seek: () => void) => {
        cleanupRef.current?.();

        setSeekingIndex(index);
        seek();

        const video = videoRef.current;

        if (!video) {
            setSeekingIndex(null);
            return;
        }

        const handleSeeked = () => {
            setSeekingIndex(null);
            cleanupRef.current = null;
        };

        video.addEventListener('seeked', handleSeeked, { once: true });
        cleanupRef.current = () => video.removeEventListener('seeked', handleSeeked);
    }, [videoRef]);

    return { seekingIndex, seekToIndex };
}
