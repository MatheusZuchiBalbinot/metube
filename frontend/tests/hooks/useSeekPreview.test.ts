// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeekPreview } from '@hooks/useSeekPreview';

class MockResizeObserver {
    static instances: MockResizeObserver[] = [];
    private callback: ResizeObserverCallback;
    public observed: Element[] = [];
    public disconnected = false;

    constructor(cb: ResizeObserverCallback) {
        this.callback = cb;
        MockResizeObserver.instances.push(this);
    }

    observe(el: Element) {
        this.observed.push(el);
    }

    unobserve() { /* noop */ }

    disconnect() {
        this.disconnected = true;
    }

    fire(width: number) {
        this.callback(
            [{ contentRect: { width } } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver,
        );
    }
}

function makeDivRef() {
    return { current: document.createElement('div') };
}

function makeVideoRef() {
    const el = document.createElement('video');
    Object.defineProperty(el, 'currentTime', { value: 0, writable: true, configurable: true });
    return { current: el as unknown as HTMLVideoElement };
}

function makeCanvasRef(drawImage = vi.fn(), clearRect = vi.fn()) {
    const el = document.createElement('canvas');
    el.getContext = vi.fn().mockReturnValue({ drawImage, clearRect });
    return { current: el as unknown as HTMLCanvasElement };
}

describe('useSeekPreview', () => {
    beforeEach(() => {
        MockResizeObserver.instances = [];
        Object.defineProperty(globalThis, 'ResizeObserver', {
            value: MockResizeObserver,
            configurable: true,
            writable: true,
        });
    });

    it('starts with seekInnerWidth = 0', () => {
        const { result } = renderHook(() => useSeekPreview(
            makeDivRef(), makeVideoRef(), makeCanvasRef(), { hoverSeekPct: null, duration: 100 },
        ));

        expect(result.current.seekInnerWidth).toBe(0);
    });

    it('updates seekInnerWidth when the observed element resizes', () => {
        const seekInnerRef = makeDivRef();
        const { result } = renderHook(() => useSeekPreview(
            seekInnerRef, makeVideoRef(), makeCanvasRef(), { hoverSeekPct: null, duration: 100 },
        ));

        act(() => {
            MockResizeObserver.instances[0].fire(320);
        });

        expect(result.current.seekInnerWidth).toBe(320);
    });

    it('disconnects the resize observer on unmount', () => {
        const { unmount } = renderHook(() => useSeekPreview(
            makeDivRef(), makeVideoRef(), makeCanvasRef(), { hoverSeekPct: null, duration: 100 },
        ));

        const observer = MockResizeObserver.instances[0];
        unmount();

        expect(observer.disconnected).toBe(true);
    });

    it('seeks the preview video to the hover position', () => {
        const previewVideoRef = makeVideoRef();
        renderHook(() => useSeekPreview(
            makeDivRef(), previewVideoRef, makeCanvasRef(), { hoverSeekPct: 0.25, duration: 200 },
        ));

        expect(previewVideoRef.current.currentTime).toBe(50);
    });

    it('does not seek the preview video when hoverSeekPct is null', () => {
        const previewVideoRef = makeVideoRef();
        renderHook(() => useSeekPreview(
            makeDivRef(), previewVideoRef, makeCanvasRef(), { hoverSeekPct: null, duration: 200 },
        ));

        expect(previewVideoRef.current.currentTime).toBe(0);
    });

    it('handlePreviewSeeked draws the current preview frame onto the canvas', () => {
        const drawImage = vi.fn();
        const previewVideoRef = makeVideoRef();
        const previewCanvasRef = makeCanvasRef(drawImage);
        const { result } = renderHook(() => useSeekPreview(
            makeDivRef(), previewVideoRef, previewCanvasRef, { hoverSeekPct: 0.5, duration: 100 },
        ));

        act(() => {
            result.current.handlePreviewSeeked();
        });

        expect(drawImage).toHaveBeenCalledWith(previewVideoRef.current, 0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    });

    it('resetPreview clears the canvas', () => {
        const clearRect = vi.fn();
        const previewCanvasRef = makeCanvasRef(vi.fn(), clearRect);
        const { result } = renderHook(() => useSeekPreview(
            makeDivRef(), makeVideoRef(), previewCanvasRef, { hoverSeekPct: null, duration: 100 },
        ));

        act(() => {
            result.current.resetPreview();
        });

        expect(clearRect).toHaveBeenCalled();
    });
});
