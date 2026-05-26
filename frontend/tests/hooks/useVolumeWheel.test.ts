// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVolumeWheel } from '@hooks/useVolumeWheel';

function makeRefs(initialVolume = 0.5) {
    const container = document.createElement('div');
    const videoEl = document.createElement('video');
    Object.defineProperty(videoEl, 'volume', {
        get: () => initialVolume,
        configurable: true,
    });
    const containerRef = { current: container };
    const videoRef = { current: videoEl };
    return { container, videoEl, containerRef, videoRef };
}

function fireWheel(target: HTMLElement, deltaY: number) {
    target.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true }));
}

describe('useVolumeWheel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls applyVolume with increased volume on scroll up (negative deltaY)', () => {
        const applyVolume = vi.fn();
        const revealControls = vi.fn();
        const { container, containerRef, videoRef } = makeRefs(0.5);

        renderHook(() => useVolumeWheel(containerRef, videoRef, applyVolume, revealControls));

        fireWheel(container, -100);

        expect(applyVolume).toHaveBeenCalledWith(expect.closeTo(0.55, 2));
        expect(revealControls).toHaveBeenCalled();
    });

    it('calls applyVolume with decreased volume on scroll down (positive deltaY)', () => {
        const applyVolume = vi.fn();
        const revealControls = vi.fn();
        const { container, containerRef, videoRef } = makeRefs(0.5);

        renderHook(() => useVolumeWheel(containerRef, videoRef, applyVolume, revealControls));

        fireWheel(container, 100);

        expect(applyVolume).toHaveBeenCalledWith(expect.closeTo(0.45, 2));
    });

    it('clamps volume to 1 when at maximum', () => {
        const applyVolume = vi.fn();
        const revealControls = vi.fn();
        const { container, containerRef, videoRef } = makeRefs(0.98);

        renderHook(() => useVolumeWheel(containerRef, videoRef, applyVolume, revealControls));

        fireWheel(container, -100);

        expect(applyVolume).toHaveBeenCalledWith(1);
    });

    it('clamps volume to 0 when at minimum', () => {
        const applyVolume = vi.fn();
        const revealControls = vi.fn();
        const { container, containerRef, videoRef } = makeRefs(0.02);

        renderHook(() => useVolumeWheel(containerRef, videoRef, applyVolume, revealControls));

        fireWheel(container, 100);

        expect(applyVolume).toHaveBeenCalledWith(0);
    });

    it('does nothing when videoRef is null', () => {
        const applyVolume = vi.fn();
        const revealControls = vi.fn();
        const { container, containerRef } = makeRefs();
        const nullVideoRef = { current: null };

        renderHook(() => useVolumeWheel(containerRef, nullVideoRef, applyVolume, revealControls));

        fireWheel(container, -100);

        expect(applyVolume).not.toHaveBeenCalled();
    });

    it('removes event listener on unmount', () => {
        const applyVolume = vi.fn();
        const revealControls = vi.fn();
        const { container, containerRef, videoRef } = makeRefs(0.5);
        const spy = vi.spyOn(container, 'removeEventListener');

        const { unmount } = renderHook(() =>
            useVolumeWheel(containerRef, videoRef, applyVolume, revealControls),
        );

        unmount();

        expect(spy).toHaveBeenCalledWith('wheel', expect.any(Function));
    });
});
