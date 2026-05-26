// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClickDoubleClick } from '@hooks/useClickDoubleClick';

describe('useClickDoubleClick', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fires onSingleClick after the delay when clicked once', () => {
        const onSingle = vi.fn();
        const onDouble = vi.fn();
        const { result } = renderHook(() => useClickDoubleClick(onSingle, onDouble, 200));

        act(() => {
            result.current.handleClick();
        });

        expect(onSingle).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(onSingle).toHaveBeenCalledTimes(1);
        expect(onDouble).not.toHaveBeenCalled();
    });

    it('fires onDoubleClick immediately on double-click and cancels single-click timer', () => {
        const onSingle = vi.fn();
        const onDouble = vi.fn();
        const { result } = renderHook(() => useClickDoubleClick(onSingle, onDouble, 200));

        act(() => {
            result.current.handleClick();
            result.current.handleDoubleClick();
        });

        expect(onDouble).toHaveBeenCalledTimes(1);

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(onSingle).not.toHaveBeenCalled();
    });

    it('respects a custom delay', () => {
        const onSingle = vi.fn();
        const onDouble = vi.fn();
        const { result } = renderHook(() => useClickDoubleClick(onSingle, onDouble, 500));

        act(() => {
            result.current.handleClick();
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(onSingle).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(onSingle).toHaveBeenCalledTimes(1);
    });

    it('uses the latest callback reference without needing a timer reset', () => {
        const onSingle1 = vi.fn();
        const onSingle2 = vi.fn();
        const onDouble = vi.fn();

        const { result, rerender } = renderHook(
            ({ cb }: { cb: () => void }) => useClickDoubleClick(cb, onDouble, 200),
            { initialProps: { cb: onSingle1 } },
        );

        act(() => {
            result.current.handleClick();
        });

        rerender({ cb: onSingle2 });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(onSingle1).not.toHaveBeenCalled();
        expect(onSingle2).toHaveBeenCalledTimes(1);
    });
});
