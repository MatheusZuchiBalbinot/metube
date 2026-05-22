// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutside } from '@hooks/useClickOutside';

function fireMouseDown(target: EventTarget) {
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: target, writable: false });
    document.dispatchEvent(event);
}

describe('useClickOutside', () => {
    let container: HTMLDivElement;
    let outside: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        outside = document.createElement('div');
        document.body.appendChild(container);
        document.body.appendChild(outside);
    });

    afterEach(() => {
        document.body.removeChild(container);
        document.body.removeChild(outside);
    });

    it('calls callback when clicking outside the ref element', () => {
        const callback = vi.fn();
        const ref = { current: container };

        renderHook(() => useClickOutside(ref, callback));

        fireMouseDown(outside);

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not call callback when clicking inside the ref element', () => {
        const callback = vi.fn();
        const ref = { current: container };

        renderHook(() => useClickOutside(ref, callback));

        fireMouseDown(container);

        expect(callback).not.toHaveBeenCalled();
    });

    it('does not call callback when enabled is false', () => {
        const callback = vi.fn();
        const ref = { current: container };

        renderHook(() => useClickOutside(ref, callback, false));

        fireMouseDown(outside);

        expect(callback).not.toHaveBeenCalled();
    });

    it('stops calling callback when enabled changes to false', () => {
        const callback = vi.fn();
        const ref = { current: container };

        const { rerender } = renderHook(
            ({ enabled }) => useClickOutside(ref, callback, enabled),
            { initialProps: { enabled: true } },
        );

        fireMouseDown(outside);
        expect(callback).toHaveBeenCalledTimes(1);

        rerender({ enabled: false });
        fireMouseDown(outside);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not call callback when ref.current is null', () => {
        const callback = vi.fn();
        const ref = { current: null };

        renderHook(() => useClickOutside(ref, callback));

        fireMouseDown(outside);

        expect(callback).not.toHaveBeenCalled();
    });

    it('removes event listener on unmount', () => {
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        const callback = vi.fn();
        const ref = { current: container };

        const { unmount } = renderHook(() => useClickOutside(ref, callback));

        unmount();

        const wasRemoved = removeSpy.mock.calls.some(([event]) => event === 'mousedown');
        expect(wasRemoved).toBe(true);

        removeSpy.mockRestore();
    });
});
