// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@hooks/useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns the initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('hello', 300));
        expect(result.current).toBe('hello');
    });

    it('does not update the debounced value before the delay elapses', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 300 } },
        );

        rerender({ value: 'updated', delay: 300 });
        expect(result.current).toBe('initial');
    });

    it('updates the debounced value after the delay elapses', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 300 } },
        );

        rerender({ value: 'updated', delay: 300 });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current).toBe('updated');
    });

    it('resets the timer on each value change (batches rapid updates)', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'a', delay: 300 } },
        );

        rerender({ value: 'b', delay: 300 });

        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'c', delay: 300 });

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(result.current).toBe('a');

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current).toBe('c');
    });

    it('works with numeric values', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 0, delay: 200 } },
        );

        rerender({ value: 42, delay: 200 });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current).toBe(42);
    });
});
