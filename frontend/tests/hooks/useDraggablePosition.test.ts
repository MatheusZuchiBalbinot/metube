// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraggablePosition } from '@hooks/useDraggablePosition';

function makePlayerRef(rect: Partial<DOMRect> = {}, size: { w: number; h: number } = { w: 360, h: 254 }) {
    const el = document.createElement('div');
    Object.defineProperty(el, 'offsetWidth', { value: size.w, configurable: true });
    Object.defineProperty(el, 'offsetHeight', { value: size.h, configurable: true });
    el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: size.w, bottom: size.h, width: size.w, height: size.h, x: 0, y: 0, toJSON: () => undefined,
        ...rect,
    } as DOMRect);
    return { current: el };
}

function mouseEvent(clientX: number, clientY: number) {
    return { clientX, clientY } as unknown as React.MouseEvent;
}

describe('useDraggablePosition', () => {
    let originalInnerWidth: number;
    let originalInnerHeight: number;

    beforeEach(() => {
        originalInnerWidth = window.innerWidth;
        originalInnerHeight = window.innerHeight;
        Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    });

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
    });

    it('starts with a null position and not dragging', () => {
        const { result } = renderHook(() => useDraggablePosition(makePlayerRef()));

        expect(result.current.pos).toBeNull();
        expect(result.current.isDragging).toBe(false);
    });

    it('starts dragging and tracks the pointer via document mousemove', () => {
        const playerRef = makePlayerRef({ left: 100, top: 50 });
        const { result } = renderHook(() => useDraggablePosition(playerRef));

        act(() => {
            result.current.startDrag(mouseEvent(120, 70));
        });

        expect(result.current.isDragging).toBe(true);
        expect(result.current.pos).toEqual({ x: 100, y: 50 });

        act(() => {
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 220, clientY: 170 }));
        });

        // offset was (20, 20) from drag start, so new pos = (220-20, 170-20)
        expect(result.current.pos).toEqual({ x: 200, y: 150 });
    });

    it('stops dragging on document mouseup', () => {
        const playerRef = makePlayerRef();
        const { result } = renderHook(() => useDraggablePosition(playerRef));

        act(() => {
            result.current.startDrag(mouseEvent(10, 10));
        });
        expect(result.current.isDragging).toBe(true);

        act(() => {
            document.dispatchEvent(new MouseEvent('mouseup'));
        });

        expect(result.current.isDragging).toBe(false);
    });

    it('clamps the dragged position to the viewport', () => {
        const playerRef = makePlayerRef({ left: 0, top: 0 }, { w: 360, h: 254 });
        const { result } = renderHook(() => useDraggablePosition(playerRef));

        act(() => {
            result.current.startDrag(mouseEvent(0, 0));
        });

        act(() => {
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 5000, clientY: 5000 }));
        });

        expect(result.current.pos).toEqual({ x: 1000 - 360, y: 800 - 254 });
    });

    it('nudge moves the position by a delta, clamped to the viewport', () => {
        const playerRef = makePlayerRef({ left: 100, top: 100 });
        const { result } = renderHook(() => useDraggablePosition(playerRef));

        act(() => {
            result.current.nudge(10, -5);
        });

        expect(result.current.pos).toEqual({ x: 110, y: 95 });
    });

    it('resetPos clears the position back to null', () => {
        const playerRef = makePlayerRef();
        const { result } = renderHook(() => useDraggablePosition(playerRef));

        act(() => {
            result.current.nudge(10, 10);
        });
        expect(result.current.pos).not.toBeNull();

        act(() => {
            result.current.resetPos();
        });
        expect(result.current.pos).toBeNull();
    });
});
