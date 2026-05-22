// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkipIndicator } from '@hooks/useSkipIndicator';
import { SkipDirection } from '@enums/skipDirection';

describe('useSkipIndicator — initial state', () => {
    it('starts with skipIndicator = null', () => {
        const { result } = renderHook(() => useSkipIndicator());
        expect(result.current.skipIndicator).toBeNull();
    });
});

describe('useSkipIndicator — showSkipIndicator', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sets skipIndicator with dir FWD and count 1 on first call', () => {
        const { result } = renderHook(() => useSkipIndicator());

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        expect(result.current.skipIndicator?.dir).toBe(SkipDirection.FWD);
        expect(result.current.skipIndicator?.count).toBe(1);
    });

    it('sets skipIndicator with dir BWD and count 1 on first call', () => {
        const { result } = renderHook(() => useSkipIndicator());

        act(() => {
            result.current.showSkipIndicator(SkipDirection.BWD);
        });

        expect(result.current.skipIndicator?.dir).toBe(SkipDirection.BWD);
        expect(result.current.skipIndicator?.count).toBe(1);
    });

    it('increments count when same direction is shown consecutively', () => {
        const { result } = renderHook(() => useSkipIndicator());

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        expect(result.current.skipIndicator?.count).toBe(2);
    });

    it('resets count to 1 when direction changes', () => {
        const { result } = renderHook(() => useSkipIndicator());

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        act(() => {
            result.current.showSkipIndicator(SkipDirection.BWD);
        });

        expect(result.current.skipIndicator?.dir).toBe(SkipDirection.BWD);
        expect(result.current.skipIndicator?.count).toBe(1);
    });

    it('increments the key on each call', () => {
        const { result } = renderHook(() => useSkipIndicator());

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        const firstKey = result.current.skipIndicator?.key;

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        const secondKey = result.current.skipIndicator?.key;
        expect(secondKey).toBeGreaterThan(firstKey!);
    });

    it('resets skipIndicator to null after 800ms', () => {
        const { result } = renderHook(() => useSkipIndicator());

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        expect(result.current.skipIndicator).not.toBeNull();

        act(() => {
            vi.advanceTimersByTime(800);
        });

        expect(result.current.skipIndicator).toBeNull();
    });

    it('resets the timer on repeated calls (debounce effect)', () => {
        const { result } = renderHook(() => useSkipIndicator());

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        act(() => {
            vi.advanceTimersByTime(400);
        });

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.skipIndicator).not.toBeNull();

        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.skipIndicator).toBeNull();
    });
});

describe('useSkipIndicator — resetSkipIndicator', () => {
    it('sets skipIndicator to null immediately', () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useSkipIndicator());

        act(() => {
            result.current.showSkipIndicator(SkipDirection.FWD);
        });

        act(() => {
            result.current.resetSkipIndicator();
        });

        expect(result.current.skipIndicator).toBeNull();

        vi.useRealTimers();
    });
});
