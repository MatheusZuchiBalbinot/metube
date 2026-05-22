// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollRestoration } from '@hooks/useScrollRestoration';

// useScrollRestoration depends on react-router-dom hooks.
// We mock both useLocation and useNavigationType so tests are self-contained.
vi.mock('react-router-dom', () => ({
    useLocation: vi.fn(),
    useNavigationType: vi.fn(),
}));

import { useLocation, useNavigationType } from 'react-router-dom';

const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;
const mockUseNavigationType = useNavigationType as ReturnType<typeof vi.fn>;

describe('useScrollRestoration — PUSH navigation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockUseLocation.mockReturnValue({ pathname: '/home' });
        mockUseNavigationType.mockReturnValue('PUSH');
        sessionStorage.clear();
        window.scrollTo = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('scrolls to top on PUSH navigation', () => {
        renderHook(() => useScrollRestoration());

        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    });
});

describe('useScrollRestoration — POP navigation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        sessionStorage.clear();
        window.scrollTo = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('scrolls to saved position on POP navigation', () => {
        sessionStorage.setItem('scroll:/home', '500');
        mockUseLocation.mockReturnValue({ pathname: '/home' });
        mockUseNavigationType.mockReturnValue('POP');

        renderHook(() => useScrollRestoration());

        act(() => {
            vi.runAllTimers();
        });

        expect(window.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'instant' });
    });

    it('scrolls to 0 on POP when no saved position exists', () => {
        mockUseLocation.mockReturnValue({ pathname: '/search' });
        mockUseNavigationType.mockReturnValue('POP');

        renderHook(() => useScrollRestoration());

        act(() => {
            vi.runAllTimers();
        });

        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    });
});

describe('useScrollRestoration — scroll saving', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        sessionStorage.clear();
        window.scrollTo = vi.fn();
        mockUseLocation.mockReturnValue({ pathname: '/home' });
        mockUseNavigationType.mockReturnValue('PUSH');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('saves scroll position to sessionStorage after scroll event (debounced)', () => {
        Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true });
        renderHook(() => useScrollRestoration());

        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(sessionStorage.getItem('scroll:/home')).toBe('300');
    });

    it('does not save scroll position before debounce delay elapses', () => {
        Object.defineProperty(window, 'scrollY', { value: 200, writable: true, configurable: true });
        renderHook(() => useScrollRestoration());

        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        act(() => {
            vi.advanceTimersByTime(50);
        });

        expect(sessionStorage.getItem('scroll:/home')).toBeNull();
    });
});
