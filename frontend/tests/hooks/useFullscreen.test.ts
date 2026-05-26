// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from '@hooks/useFullscreen';

describe('useFullscreen', () => {
    let container: HTMLDivElement;
    let containerRef: React.RefObject<HTMLDivElement | null>;

    beforeEach(() => {
        container = document.createElement('div');
        containerRef = { current: container };
        container.requestFullscreen = vi.fn().mockResolvedValue(undefined);
        document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(document, 'fullscreenElement', {
            get: () => null,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initialises with isFullscreen = false', () => {
        const { result } = renderHook(() => useFullscreen(containerRef));
        expect(result.current.isFullscreen).toBe(false);
    });

    it('toggleFullscreen calls requestFullscreen when not in fullscreen', async () => {
        const { result } = renderHook(() => useFullscreen(containerRef));

        await act(async () => {
            result.current.toggleFullscreen();
        });

        expect(container.requestFullscreen).toHaveBeenCalled();
    });

    it('toggleFullscreen calls exitFullscreen when already in fullscreen', async () => {
        Object.defineProperty(document, 'fullscreenElement', {
            get: () => container,
            configurable: true,
        });

        const { result } = renderHook(() => useFullscreen(containerRef));

        await act(async () => {
            result.current.toggleFullscreen();
        });

        expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('updates isFullscreen state when fullscreenchange fires', () => {
        const { result } = renderHook(() => useFullscreen(containerRef));

        Object.defineProperty(document, 'fullscreenElement', {
            get: () => container,
            configurable: true,
        });

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        expect(result.current.isFullscreen).toBe(true);

        Object.defineProperty(document, 'fullscreenElement', {
            get: () => null,
            configurable: true,
        });

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        expect(result.current.isFullscreen).toBe(false);
    });

    it('does nothing when containerRef is null', async () => {
        const nullRef = { current: null };
        const { result } = renderHook(() => useFullscreen(nullRef));

        await act(async () => {
            result.current.toggleFullscreen();
        });

        expect(container.requestFullscreen).not.toHaveBeenCalled();
    });

    it('removes fullscreenchange listener on unmount', () => {
        const spy = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderHook(() => useFullscreen(containerRef));
        unmount();
        expect(spy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
    });
});
