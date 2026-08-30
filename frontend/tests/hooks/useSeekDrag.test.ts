// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeekDrag } from '@hooks/useSeekDrag';

function makeInnerRef(width = 200) {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: width, bottom: 20, width, height: 20, x: 0, y: 0, toJSON: () => undefined,
    } as DOMRect);
    return { current: el };
}

function makeVideoRef(duration = 100) {
    const el = document.createElement('video');
    Object.defineProperty(el, 'duration', { value: duration, configurable: true });
    Object.defineProperty(el, 'currentTime', { value: 0, writable: true, configurable: true });
    return { current: el as unknown as HTMLVideoElement };
}

function mouseEvent(clientX: number) {
    return {
        stopPropagation: () => undefined,
        preventDefault: () => undefined,
        clientX,
    } as unknown as React.MouseEvent<HTMLDivElement>;
}

function setup(overrides: Partial<{ duration: number }> = {}) {
    const seekInnerRef = makeInnerRef();
    const videoRef = makeVideoRef();
    const forceShow = vi.fn();
    const scheduleHideControls = vi.fn();
    const onDraggingChange = vi.fn();

    const { result } = renderHook(() => useSeekDrag(seekInnerRef, videoRef, {
        duration: 100,
        forceShow,
        scheduleHideControls,
        onDraggingChange,
        ...overrides,
    }));

    return { result, seekInnerRef, videoRef, forceShow, scheduleHideControls, onDraggingChange };
}

describe('useSeekDrag', () => {
    it('starts idle with no drag/hover pct', () => {
        const { result } = setup();

        expect(result.current.isDragging).toBe(false);
        expect(result.current.dragPct).toBeNull();
        expect(result.current.hoverSeekPct).toBeNull();
    });

    it('seeks the video on a plain click', () => {
        const { result, videoRef } = setup();

        act(() => {
            result.current.handleSeekClick(mouseEvent(50));
        });

        expect(videoRef.current.currentTime).toBeCloseTo(25);
    });

    it('does nothing on click when duration is 0', () => {
        const { result, videoRef } = setup({ duration: 0 });

        act(() => {
            result.current.handleSeekClick(mouseEvent(50));
        });

        expect(videoRef.current.currentTime).toBe(0);
    });

    it('tracks hover position while not dragging, and clears it on leave', () => {
        const { result } = setup();

        act(() => {
            result.current.handleSeekMouseMove(mouseEvent(100));
        });
        expect(result.current.hoverSeekPct).toBeCloseTo(0.5);

        act(() => {
            result.current.handleSeekMouseLeave();
        });
        expect(result.current.hoverSeekPct).toBeNull();
    });

    it('runs a full drag: mousedown starts it, document mousemove updates pct, mouseup commits the seek', () => {
        const { result, videoRef, forceShow, scheduleHideControls, onDraggingChange } = setup();

        act(() => {
            result.current.handleSeekMouseDown(mouseEvent(40));
        });

        expect(result.current.isDragging).toBe(true);
        expect(onDraggingChange).toHaveBeenCalledWith(true);
        expect(forceShow).toHaveBeenCalled();

        act(() => {
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
        });
        expect(result.current.dragPct).toBeCloseTo(0.5);
        expect(result.current.hoverSeekPct).toBeCloseTo(0.5);

        act(() => {
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 150 }));
        });

        expect(result.current.isDragging).toBe(false);
        expect(result.current.dragPct).toBeNull();
        expect(videoRef.current.currentTime).toBeCloseTo(75);
        expect(scheduleHideControls).toHaveBeenCalled();
    });

    it('ignores the click that immediately follows a drag release', () => {
        const { result, videoRef } = setup();

        act(() => {
            result.current.handleSeekMouseDown(mouseEvent(40));
        });
        act(() => {
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 150 }));
        });

        const afterDrag = videoRef.current.currentTime;

        act(() => {
            result.current.handleSeekClick(mouseEvent(0));
        });
        expect(videoRef.current.currentTime).toBe(afterDrag);

        // The click after that is a real click again.
        act(() => {
            result.current.handleSeekClick(mouseEvent(0));
        });
        expect(videoRef.current.currentTime).toBe(0);
    });

    it('resetDragState clears dragging, pct state and the wasDragging flag', () => {
        const { result, onDraggingChange } = setup();

        act(() => {
            result.current.handleSeekMouseDown(mouseEvent(40));
        });
        act(() => {
            result.current.resetDragState();
        });

        expect(result.current.isDragging).toBe(false);
        expect(result.current.dragPct).toBeNull();
        expect(result.current.hoverSeekPct).toBeNull();
        expect(onDraggingChange).toHaveBeenLastCalledWith(false);
    });
});
