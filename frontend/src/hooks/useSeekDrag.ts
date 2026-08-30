import { useEffect, useRef, useState } from 'react';

interface UseSeekDragOptions {
    duration: number
    forceShow: () => void
    scheduleHideControls: () => void
    onDraggingChange: (isDragging: boolean) => void
}

/**
 * Encapsulates seek-bar drag state: pointer-down → document-level drag →
 * pointer-up, plus the click/hover handlers that share the same pct math.
 */
export function useSeekDrag(
    seekInnerRef: React.RefObject<HTMLDivElement | null>,
    videoRef: React.RefObject<HTMLVideoElement | null>,
    { duration, forceShow, scheduleHideControls, onDraggingChange }: UseSeekDragOptions,
) {
    const wasDraggingRef = useRef(false);

    const [isDragging, setIsDragging] = useState(false);
    const [dragPct, setDragPct] = useState<number | null>(null);
    const [hoverSeekPct, setHoverSeekPct] = useState<number | null>(null);

    function changeDragging(v: boolean) {
        setIsDragging(v);
        onDraggingChange(v);
    }

    function pctFromClientX(clientX: number): number {
        const inner = seekInnerRef.current;
        if (!inner) {
            return 0;
        }
        const rect = inner.getBoundingClientRect();
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    function resetDragState() {
        changeDragging(false);
        setDragPct(null);
        setHoverSeekPct(null);
        wasDraggingRef.current = false;
    }

    useEffect(() => {
        if (!isDragging) {
            return;
        }
        forceShow();

        function onMouseMove(e: MouseEvent) {
            const pct = pctFromClientX(e.clientX);
            setDragPct(pct);
            setHoverSeekPct(pct);
        }

        function onMouseUp(e: MouseEvent) {
            const el = videoRef.current;
            if (el && el.duration > 0) {
                el.currentTime = pctFromClientX(e.clientX) * el.duration;
            }
            wasDraggingRef.current = true;
            changeDragging(false);
            setDragPct(null);
            setHoverSeekPct(null);
            scheduleHideControls();
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging]);

    function handleSeekClick(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        if (wasDraggingRef.current) {
            wasDraggingRef.current = false;
            return;
        }
        const el = videoRef.current;
        const hasDuration = duration > 0;
        if (!el || !hasDuration) {
            return;
        }
        el.currentTime = pctFromClientX(e.clientX) * duration;
    }

    function handleSeekMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();
        const pct = pctFromClientX(e.clientX);
        changeDragging(true);
        setDragPct(pct);
        setHoverSeekPct(pct);
    }

    function handleSeekMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!isDragging) {
            setHoverSeekPct(pctFromClientX(e.clientX));
        }
    }

    function handleSeekMouseLeave() {
        if (!isDragging) {
            setHoverSeekPct(null);
        }
    }

    return {
        isDragging,
        dragPct,
        hoverSeekPct,
        handleSeekClick,
        handleSeekMouseDown,
        handleSeekMouseMove,
        handleSeekMouseLeave,
        resetDragState,
    };
}
