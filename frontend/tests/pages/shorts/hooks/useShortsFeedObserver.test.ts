// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShortsFeedObserver } from '@pages/shorts/hooks/useShortsFeedObserver';

class MockIntersectionObserver {
    static instances: MockIntersectionObserver[] = [];
    private callback: IntersectionObserverCallback;
    public observed: Element[] = [];
    public disconnected = false;

    constructor(cb: IntersectionObserverCallback) {
        this.callback = cb;
        MockIntersectionObserver.instances.push(this);
    }

    observe(el: Element) {
        this.observed.push(el);
    }

    unobserve() { /* noop */ }
    takeRecords() {
        return [];
    }

    disconnect() {
        this.disconnected = true;
    }

    fire(entries: { target: Element; intersectionRatio: number }[]) {
        this.callback(entries as unknown as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
    }
}

describe('useShortsFeedObserver', () => {
    beforeEach(() => {
        MockIntersectionObserver.instances = [];
        Object.defineProperty(globalThis, 'IntersectionObserver', {
            value: MockIntersectionObserver,
            configurable: true,
            writable: true,
        });
    });

    it('does not create an observer when count is 0', () => {
        const feedRef = { current: document.createElement('div') };
        const itemRefs = { current: [] };
        const onActivate = vi.fn();

        renderHook(() => useShortsFeedObserver(feedRef, itemRefs, onActivate, 0));

        expect(MockIntersectionObserver.instances).toHaveLength(0);
    });

    it('observes every mounted item element', () => {
        const feedRef = { current: document.createElement('div') };
        const el1 = document.createElement('div');
        const el2 = document.createElement('div');
        const itemRefs = { current: [el1, el2] };
        const onActivate = vi.fn();

        renderHook(() => useShortsFeedObserver(feedRef, itemRefs, onActivate, 2));

        const observer = MockIntersectionObserver.instances[0];
        expect(observer.observed).toEqual([el1, el2]);
    });

    it('calls onActivate with the index of the visible item', () => {
        const feedRef = { current: document.createElement('div') };
        const el1 = document.createElement('div');
        const el2 = document.createElement('div');
        const itemRefs = { current: [el1, el2] };
        const onActivate = vi.fn();

        renderHook(() => useShortsFeedObserver(feedRef, itemRefs, onActivate, 2));
        const observer = MockIntersectionObserver.instances[0];

        observer.fire([{ target: el2, intersectionRatio: 0.8 }]);

        expect(onActivate).toHaveBeenCalledWith(1);
    });

    it('ignores entries below the intersection threshold', () => {
        const feedRef = { current: document.createElement('div') };
        const el1 = document.createElement('div');
        const itemRefs = { current: [el1] };
        const onActivate = vi.fn();

        renderHook(() => useShortsFeedObserver(feedRef, itemRefs, onActivate, 1));
        const observer = MockIntersectionObserver.instances[0];

        observer.fire([{ target: el1, intersectionRatio: 0.3 }]);

        expect(onActivate).not.toHaveBeenCalled();
    });

    it('disconnects the observer on unmount', () => {
        const feedRef = { current: document.createElement('div') };
        const itemRefs = { current: [document.createElement('div')] };

        const { unmount } = renderHook(() => useShortsFeedObserver(feedRef, itemRefs, vi.fn(), 1));
        const observer = MockIntersectionObserver.instances[0];

        unmount();

        expect(observer.disconnected).toBe(true);
    });
});
