// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerHoldSpeed } from '@hooks/usePlayerHoldSpeed';

function pointerEvent(button: number, onControls: boolean): React.PointerEvent {
    const target = document.createElement('div');
    if (onControls) {
        const bar = document.createElement('div');
        bar.className = 'vp__controls';
        bar.appendChild(target);
    }
    return { button, target } as unknown as React.PointerEvent;
}

describe('usePlayerHoldSpeed', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('switches to 2× after holding the primary button', () => {
        const applyPlaybackRate = vi.fn();
        const { result } = renderHook(() => usePlayerHoldSpeed(1, applyPlaybackRate, vi.fn()));

        act(() => {
            result.current.handleSurfacePointerDown(pointerEvent(0, false));
        });
        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.holdSpeedActive).toBe(true);
        expect(applyPlaybackRate).toHaveBeenCalledWith(2);
    });

    it('ignores presses that land on the controls bar', () => {
        const applyPlaybackRate = vi.fn();
        const { result } = renderHook(() => usePlayerHoldSpeed(1, applyPlaybackRate, vi.fn()));

        act(() => {
            result.current.handleSurfacePointerDown(pointerEvent(0, true));
        });
        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.holdSpeedActive).toBe(false);
        expect(applyPlaybackRate).not.toHaveBeenCalled();
    });

    it('ignores non-primary buttons', () => {
        const applyPlaybackRate = vi.fn();
        const { result } = renderHook(() => usePlayerHoldSpeed(1, applyPlaybackRate, vi.fn()));

        act(() => {
            result.current.handleSurfacePointerDown(pointerEvent(2, false));
        });
        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(applyPlaybackRate).not.toHaveBeenCalled();
    });

    it('restores the previous rate on release', () => {
        const applyPlaybackRate = vi.fn();
        const { result } = renderHook(() => usePlayerHoldSpeed(1.5, applyPlaybackRate, vi.fn()));

        act(() => {
            result.current.handleSurfacePointerDown(pointerEvent(0, false));
        });
        act(() => {
            vi.advanceTimersByTime(350);
        });
        act(() => {
            result.current.handleSurfacePointerEnd();
        });

        expect(applyPlaybackRate).toHaveBeenLastCalledWith(1.5);
        expect(result.current.holdSpeedActive).toBe(false);
    });

    it('does nothing on release when no hold is active', () => {
        const applyPlaybackRate = vi.fn();
        const { result } = renderHook(() => usePlayerHoldSpeed(1, applyPlaybackRate, vi.fn()));

        act(() => {
            result.current.handleSurfacePointerDown(pointerEvent(0, false));
        });
        // Release before the hold delay elapses.
        act(() => {
            result.current.handleSurfacePointerEnd();
        });

        expect(applyPlaybackRate).not.toHaveBeenCalled();
        expect(result.current.holdSpeedActive).toBe(false);
    });

    it('swallows the trailing click after a hold, then clicks normally', () => {
        const onClick = vi.fn();
        const { result } = renderHook(() => usePlayerHoldSpeed(1, vi.fn(), onClick));

        act(() => {
            result.current.handleSurfacePointerDown(pointerEvent(0, false));
        });
        act(() => {
            vi.advanceTimersByTime(350);
        });
        act(() => {
            result.current.handleSurfacePointerEnd();
        });

        // First click right after the hold is swallowed.
        act(() => {
            result.current.handleSurfaceClick();
        });
        expect(onClick).not.toHaveBeenCalled();

        // Subsequent click behaves normally.
        act(() => {
            result.current.handleSurfaceClick();
        });
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
