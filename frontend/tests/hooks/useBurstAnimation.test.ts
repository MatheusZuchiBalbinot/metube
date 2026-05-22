// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBurstAnimation } from '@hooks/useBurstAnimation';

describe('useBurstAnimation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts with animating = false', () => {
        const { result } = renderHook(() => useBurstAnimation());
        const [animating] = result.current;
        expect(animating).toBe(false);
    });

    it('sets animating to true immediately when trigger is called', () => {
        const { result } = renderHook(() => useBurstAnimation());
        const [, trigger] = result.current;

        act(() => {
            trigger();
        });

        const [animating] = result.current;
        expect(animating).toBe(true);
    });

    it('resets animating to false after the default duration (400ms)', () => {
        const { result } = renderHook(() => useBurstAnimation());
        const [, trigger] = result.current;

        act(() => {
            trigger();
        });

        act(() => {
            vi.advanceTimersByTime(400);
        });

        const [animating] = result.current;
        expect(animating).toBe(false);
    });

    it('resets animating after a custom duration', () => {
        const { result } = renderHook(() => useBurstAnimation(800));
        const [, trigger] = result.current;

        act(() => {
            trigger();
        });

        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current[0]).toBe(true);

        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current[0]).toBe(false);
    });

    it('re-triggers animation when trigger is called again', () => {
        const { result } = renderHook(() => useBurstAnimation());
        const [, trigger] = result.current;

        act(() => {
            trigger();
        });

        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current[0]).toBe(false);

        act(() => {
            trigger();
        });

        expect(result.current[0]).toBe(true);
    });
});
