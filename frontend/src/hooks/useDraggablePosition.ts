import { useEffect, useRef, useState } from 'react';

// Expected footprint of the mini player (360px wide, 16:9 preview + footer)
// used as the clamp fallback before the element has been measured.
const DEFAULT_PLAYER_W = 360;
const DEFAULT_PLAYER_H = 254;

function clampToViewport(x: number, y: number, el: HTMLElement | null): { x: number; y: number } {
    const playerW = el?.offsetWidth ?? DEFAULT_PLAYER_W;
    const playerH = el?.offsetHeight ?? DEFAULT_PLAYER_H;
    return {
        x: Math.max(0, Math.min(x, window.innerWidth - playerW)),
        y: Math.max(0, Math.min(y, window.innerHeight - playerH)),
    };
}

// Resolves the first defined value, falling back to a hard default — used to
// pick between a freshly-measured DOMRect coordinate and the last known state position.
function resolvePreferred(a: number | undefined, b: number | undefined, fallback: number) {
    return a ?? b ?? fallback;
}

// Prefers the freshly-measured DOMRect (source of truth right after a layout),
// falling back to the last known state position, then a hard default.
function resolveDragStart(rect: DOMRect | undefined, pos: { x: number; y: number } | null) {
    return {
        x: resolvePreferred(rect?.left, pos?.x, 0),
        y: resolvePreferred(rect?.top, pos?.y, 0),
    };
}

// Prefers the last known state position, falling back to the DOMRect, then a hard default.
function resolveNudgeBase(pos: { x: number; y: number } | null, rect: DOMRect | undefined) {
    return {
        x: resolvePreferred(pos?.x, rect?.left, 0),
        y: resolvePreferred(pos?.y, rect?.top, 0),
    };
}

/**
 * Free-floating draggable position for an element pinned with `position: fixed`.
 * Supports both mouse drag and arrow-key nudging, clamped to the viewport
 * with a single shared fallback size so both paths agree on the boundary.
 */
export function useDraggablePosition(playerRef: React.RefObject<HTMLElement | null>) {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!isDragging) {
            return;
        }

        function handleMouseMove(e: MouseEvent) {
            setPos(clampToViewport(
                e.clientX - dragOffsetRef.current.x,
                e.clientY - dragOffsetRef.current.y,
                playerRef.current,
            ));
        }

        function handleMouseUp() {
            setIsDragging(false);
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging]);

    function startDrag(e: React.MouseEvent) {
        const rect = playerRef.current?.getBoundingClientRect();
        const { x: currentX, y: currentY } = resolveDragStart(rect, pos);

        if (pos === null) {
            setPos({ x: currentX, y: currentY });
        }

        setIsDragging(true);
        dragOffsetRef.current = {
            x: e.clientX - currentX,
            y: e.clientY - currentY,
        };
    }

    function nudge(deltaX: number, deltaY: number) {
        const el = playerRef.current;
        const rect = el?.getBoundingClientRect();
        const { x: baseX, y: baseY } = resolveNudgeBase(pos, rect);

        setPos(clampToViewport(baseX + deltaX, baseY + deltaY, el));
    }

    function resetPos() {
        setPos(null);
    }

    return { pos, isDragging, startDrag, nudge, resetPos };
}
