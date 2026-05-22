// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '@hooks/useMediaQuery';

type ChangeHandler = (event: MediaQueryListEvent) => void;

function createMatchMediaMock(initialMatches: boolean) {
    const listeners: ChangeHandler[] = [];

    const mql = {
        matches: initialMatches,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, handler: ChangeHandler) => {
            if (event === 'change') {
                listeners.push(handler);
            }
        }),
        removeEventListener: vi.fn((event: string, handler: ChangeHandler) => {
            if (event === 'change') {
                const index = listeners.indexOf(handler);

                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            }
        }),
        dispatchEvent: vi.fn(),
        trigger(matches: boolean) {
            const event = { matches } as MediaQueryListEvent;
            listeners.forEach(fn => fn(event));
        },
    };

    return mql;
}

describe('useMediaQuery', () => {
    let mockMql: ReturnType<typeof createMatchMediaMock>;

    beforeEach(() => {
        mockMql = createMatchMediaMock(false);
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn(() => mockMql),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns false when media query does not match initially', () => {
        mockMql = createMatchMediaMock(false);
        Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => mockMql) });

        const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        expect(result.current).toBe(false);
    });

    it('returns true when media query matches initially', () => {
        mockMql = createMatchMediaMock(true);
        Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => mockMql) });

        const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        expect(result.current).toBe(true);
    });

    it('updates when media query match state changes', () => {
        mockMql = createMatchMediaMock(false);
        Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => mockMql) });

        const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        expect(result.current).toBe(false);

        act(() => {
            mockMql.trigger(true);
        });

        expect(result.current).toBe(true);
    });

    it('toggles back to false when match state changes back', () => {
        mockMql = createMatchMediaMock(true);
        Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => mockMql) });

        const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

        act(() => {
            mockMql.trigger(false);
        });

        expect(result.current).toBe(false);
    });

    it('removes the change listener on unmount', () => {
        mockMql = createMatchMediaMock(false);
        Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => mockMql) });

        const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

        unmount();

        expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
});
