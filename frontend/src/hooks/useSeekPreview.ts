import { useEffect, useState } from 'react';

interface UseSeekPreviewOptions {
    hoverSeekPct: number | null
    duration: number
}

/**
 * Encapsulates the scrubber thumbnail preview: tracks the seek bar's width
 * (for arrow alignment), seeks the hidden preview video to the hover
 * position, and captures the resulting frame onto the preview canvas.
 */
export function useSeekPreview(
    seekInnerRef: React.RefObject<HTMLDivElement | null>,
    previewVideoRef: React.RefObject<HTMLVideoElement | null>,
    previewCanvasRef: React.RefObject<HTMLCanvasElement | null>,
    { hoverSeekPct, duration }: UseSeekPreviewOptions,
) {
    const [seekInnerWidth, setSeekInnerWidth] = useState(0);

    useEffect(() => {
        const el = seekInnerRef.current;
        if (!el) {
            return;
        }
        const ro = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                setSeekInnerWidth(entry.contentRect.width);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [seekInnerRef]);

    useEffect(() => {
        const pv = previewVideoRef.current;

        if (!pv || hoverSeekPct === null || duration === 0) {
            return;
        }

        pv.currentTime = hoverSeekPct * duration;
    }, [hoverSeekPct, duration, previewVideoRef]);

    function handlePreviewSeeked() {
        const pv = previewVideoRef.current;
        const canvas = previewCanvasRef.current;
        if (!pv || !canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        try {
            ctx.drawImage(pv, 0, 0, canvas.width, canvas.height);
        } catch { /* CORS/decode error — canvas stays black */ }
    }

    function resetPreview() {
        const canvas = previewCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    return { seekInnerWidth, handlePreviewSeeked, resetPreview };
}
