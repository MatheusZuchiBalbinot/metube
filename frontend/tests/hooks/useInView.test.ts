// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import { useInView } from '@hooks/useInView';

// ─── IntersectionObserver mock ─────────────────────────────────────────────────

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

interface MockHandle {
    trigger: (isIntersecting: boolean) => void;
    disconnected: boolean;
    observed: Element | null;
    unobserved: Element | null;
}

let mockHandle: MockHandle = {
    trigger: () => undefined,
    disconnected: false,
    observed: null,
    unobserved: null,
};

class MockIntersectionObserver {
    private _cb: IntersectionCallback;

    constructor(cb: IntersectionCallback) {
        this._cb = cb;
        mockHandle = {
            trigger: (isIntersecting: boolean) => {
                this._cb([{ isIntersecting } as IntersectionObserverEntry]);
            },
            disconnected: false,
            observed: null,
            unobserved: null,
        };
    }

    observe(el: Element) {
        mockHandle.observed = el;
    }

    unobserve(el: Element) {
        mockHandle.unobserved = el;
    }

    disconnect() {
        mockHandle.disconnected = true;
    }
}

function installObserverMock() {
    Object.defineProperty(window, 'IntersectionObserver', {
        writable: true,
        configurable: true,
        value: MockIntersectionObserver,
    });
}

// ─── Helper: wrap useInView attaching a real DOM element to the ref ────────────

function useInViewWithElement(options?: Parameters<typeof useInView>[0]) {
    const result = useInView(options);
    const elRef = useRef<HTMLElement | null>(null);

    useLayoutEffect(() => {
        if (elRef.current === null) {
            const el = document.createElement('div');
            document.body.appendChild(el);
            elRef.current = el;
        }
        // eslint-disable-next-line react-hooks/immutability
        (result.ref as React.MutableRefObject<HTMLElement | null>).current = elRef.current;
    });

    return result;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('useInView — initial state', () => {
    beforeEach(() => {
        installObserverMock();
    });

    it('starts with inView = false', () => {
        const { result } = renderHook(() => useInView());
        expect(result.current.inView).toBe(false);
    });

    it('returns a ref object', () => {
        const { result } = renderHook(() => useInView());
        expect(result.current.ref).toBeDefined();
        expect(result.current.ref).toHaveProperty('current');
    });
});

describe('useInView — intersection changes', () => {
    beforeEach(() => {
        installObserverMock();
    });

    it('sets inView to true when element enters viewport', () => {
        const { result } = renderHook(() => useInViewWithElement());

        act(() => {
            mockHandle.trigger(true);
        });

        expect(result.current.inView).toBe(true);
    });

    it('keeps inView true after element exits viewport when once = true (default)', () => {
        const { result } = renderHook(() => useInViewWithElement({ once: true }));

        act(() => {
            mockHandle.trigger(true);
        });

        act(() => {
            mockHandle.trigger(false);
        });

        expect(result.current.inView).toBe(true);
    });

    it('sets inView back to false when element exits viewport and once = false', () => {
        const { result } = renderHook(() => useInViewWithElement({ once: false }));

        act(() => {
            mockHandle.trigger(true);
        });

        expect(result.current.inView).toBe(true);

        act(() => {
            mockHandle.trigger(false);
        });

        expect(result.current.inView).toBe(false);
    });
});

describe('useInView — cleanup', () => {
    beforeEach(() => {
        installObserverMock();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('disconnects the observer on unmount', () => {
        const { unmount } = renderHook(() => useInViewWithElement());

        unmount();

        expect(mockHandle.disconnected).toBe(true);
    });
});
