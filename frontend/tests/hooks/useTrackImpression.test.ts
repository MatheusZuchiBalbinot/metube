// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrackImpression } from '@hooks/useTrackImpression';
import { AnalyticsSource } from '@api';
import type { Vuid } from '@api';

const reportSpy = vi.hoisted(() => vi.fn());
vi.mock('@utils', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        reportImpression: reportSpy,
    };
});

class MockObserver {
    static instances: MockObserver[] = [];
    private callback: IntersectionObserverCallback;
    public observed: Element[] = [];
    public disconnected = false;

    constructor(cb: IntersectionObserverCallback, _opts: IntersectionObserverInit) {
        this.callback = cb;
        MockObserver.instances.push(this);
    }

    observe(el: Element) {
        this.observed.push(el);
    }

    disconnect() {
        this.disconnected = true;
    }

    unobserve() { /* noop */ }
    takeRecords() {
        return [];
    }
    fire(ratio: number, isIntersecting: boolean) {
        this.callback(
            [{
                isIntersecting,
                intersectionRatio: ratio,
                target: this.observed[0],
            } as unknown as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
        );
    }
}

describe('useTrackImpression', () => {
    beforeEach(() => {
        MockObserver.instances = [];
        reportSpy.mockClear();
        Object.defineProperty(globalThis, 'IntersectionObserver', {
            value: MockObserver,
            configurable: true,
            writable: true,
        });
    });

    function makeRefWithEl() {
        const el = document.createElement('div');
        return { ref: { current: el }, el };
    }

    it('does nothing when enabled=false', () => {
        const { ref } = makeRefWithEl();
        renderHook(() => useTrackImpression(ref, 'v-1' as Vuid, AnalyticsSource.GRID, { enabled: false }));

        expect(MockObserver.instances).toHaveLength(0);
    });

    it('does nothing when ref.current is null', () => {
        renderHook(() => useTrackImpression(
            { current: null },
            'v-1' as Vuid,
            AnalyticsSource.GRID,
        ));

        expect(MockObserver.instances).toHaveLength(0);
    });

    it('does nothing when IntersectionObserver is unsupported', () => {
        Reflect.deleteProperty(globalThis as object, 'IntersectionObserver');
        const { ref } = makeRefWithEl();
        renderHook(() => useTrackImpression(ref, 'v-1' as Vuid, AnalyticsSource.GRID));

        expect(reportSpy).not.toHaveBeenCalled();
    });

    it('observes the element and reports an impression when threshold is reached', () => {
        const { ref } = makeRefWithEl();
        renderHook(() => useTrackImpression(ref, 'v-1' as Vuid, AnalyticsSource.GRID));

        expect(MockObserver.instances).toHaveLength(1);
        const observer = MockObserver.instances[0];
        observer.fire(0.8, true);

        expect(reportSpy).toHaveBeenCalledWith('v-1', AnalyticsSource.GRID);
        expect(observer.disconnected).toBe(true);
    });

    it('does not report when entry is not visible enough', () => {
        const { ref } = makeRefWithEl();
        renderHook(() => useTrackImpression(ref, 'v-2' as Vuid, AnalyticsSource.GRID));

        const observer = MockObserver.instances[0];
        observer.fire(0.2, true);

        expect(reportSpy).not.toHaveBeenCalled();
        expect(observer.disconnected).toBe(false);
    });

    it('disconnects on unmount', () => {
        const { ref } = makeRefWithEl();
        const { unmount } = renderHook(() => useTrackImpression(ref, 'v-3' as Vuid, AnalyticsSource.GRID));

        const observer = MockObserver.instances[0];
        unmount();

        expect(observer.disconnected).toBe(true);
    });

    it('respects a custom threshold', () => {
        const { ref } = makeRefWithEl();
        renderHook(() => useTrackImpression(ref, 'v-4' as Vuid, AnalyticsSource.GRID, { threshold: 0.9 }));

        const observer = MockObserver.instances[0];
        observer.fire(0.85, true);
        expect(reportSpy).not.toHaveBeenCalled();

        observer.fire(0.95, true);
        expect(reportSpy).toHaveBeenCalled();
    });
});
