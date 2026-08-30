// @vitest-environment jsdom
import { useEffect } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { usePinnedPlayer } from '@pages/video/hooks/usePinnedPlayer';

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

    fire(isIntersecting: boolean, top: number) {
        this.callback(
            [{ isIntersecting, boundingClientRect: { top } } as unknown as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
        );
    }
}

let latest: ReturnType<typeof usePinnedPlayer> | null = null;

function Harness({ enabled }: { enabled: boolean }) {
    const pinnedPlayer = usePinnedPlayer(enabled);
    const { sentinelRef, wrapRef } = pinnedPlayer;

    useEffect(() => {
        latest = pinnedPlayer;
    });

    return (
        <div>
            <div ref={sentinelRef} data-testid="sentinel" />
            <div ref={wrapRef} data-testid="wrap" />
        </div>
    );
}

describe('usePinnedPlayer', () => {
    beforeEach(() => {
        MockIntersectionObserver.instances = [];
        latest = null;
        Object.defineProperty(globalThis, 'IntersectionObserver', {
            value: MockIntersectionObserver,
            configurable: true,
            writable: true,
        });
    });

    it('does not observe anything when disabled', () => {
        render(<Harness enabled={false} />);

        expect(MockIntersectionObserver.instances).toHaveLength(0);
    });

    it('starts unpinned', () => {
        render(<Harness enabled={true} />);

        expect(latest?.pinned).toBe(false);
        expect(latest?.reservedHeight).toBe(0);
    });

    it('pins when the sentinel scrolls above the viewport', () => {
        render(<Harness enabled={true} />);

        expect(MockIntersectionObserver.instances).toHaveLength(1);
        const observer = MockIntersectionObserver.instances[0];

        act(() => {
            observer.fire(false, -50);
        });

        expect(latest?.pinned).toBe(true);
    });

    it('does not pin when not intersecting but not scrolled above (top >= 0)', () => {
        render(<Harness enabled={true} />);
        const observer = MockIntersectionObserver.instances[0];

        act(() => {
            observer.fire(false, 50);
        });

        expect(latest?.pinned).toBe(false);
    });

    it('unpins automatically once the sentinel is intersecting again', () => {
        render(<Harness enabled={true} />);
        const observer = MockIntersectionObserver.instances[0];

        act(() => {
            observer.fire(false, -50);
        });
        expect(latest?.pinned).toBe(true);

        act(() => {
            observer.fire(true, 0);
        });
        expect(latest?.pinned).toBe(false);
    });

    it('unpin() dismisses pinning and it stays dismissed until intersecting again', () => {
        render(<Harness enabled={true} />);
        const observer = MockIntersectionObserver.instances[0];

        act(() => {
            observer.fire(false, -50);
        });
        expect(latest?.pinned).toBe(true);

        act(() => {
            latest?.unpin();
        });
        expect(latest?.pinned).toBe(false);

        // Further "scrolled above" events are ignored while dismissed.
        act(() => {
            observer.fire(false, -80);
        });
        expect(latest?.pinned).toBe(false);
    });

    it('disconnects the observer on unmount', () => {
        const { unmount } = render(<Harness enabled={true} />);
        const observer = MockIntersectionObserver.instances[0];

        unmount();

        expect(observer.disconnected).toBe(true);
    });
});
