// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePictureInPicture } from '@hooks/usePictureInPicture';

describe('usePictureInPicture', () => {
    let videoEl: HTMLVideoElement;
    let videoRef: React.RefObject<HTMLVideoElement | null>;

    beforeEach(() => {
        videoEl = document.createElement('video');
        videoRef = { current: videoEl };
        videoEl.requestPictureInPicture = vi.fn().mockResolvedValue({} as PictureInPictureWindow);
        document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(document, 'pictureInPictureEnabled', {
            get: () => true,
            configurable: true,
        });
        Object.defineProperty(document, 'pictureInPictureElement', {
            get: () => null,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initialises with isActive = false', () => {
        const { result } = renderHook(() => usePictureInPicture(videoRef));
        expect(result.current.isActive).toBe(false);
    });

    it('isSupported reflects document.pictureInPictureEnabled', () => {
        const { result } = renderHook(() => usePictureInPicture(videoRef));
        expect(result.current.isSupported).toBe(true);
    });

    it('togglePiP calls requestPictureInPicture when not in PiP', async () => {
        const { result } = renderHook(() => usePictureInPicture(videoRef));

        await act(async () => {
            await result.current.togglePiP();
        });

        expect(videoEl.requestPictureInPicture).toHaveBeenCalled();
    });

    it('togglePiP calls exitPictureInPicture when already in PiP', async () => {
        Object.defineProperty(document, 'pictureInPictureElement', {
            get: () => videoEl,
            configurable: true,
        });

        const { result } = renderHook(() => usePictureInPicture(videoRef));

        await act(async () => {
            await result.current.togglePiP();
        });

        expect(document.exitPictureInPicture).toHaveBeenCalled();
    });

    it('enterpictureinpicture event sets isActive to true', () => {
        const { result } = renderHook(() => usePictureInPicture(videoRef));

        act(() => {
            videoEl.dispatchEvent(new Event('enterpictureinpicture'));
        });

        expect(result.current.isActive).toBe(true);
    });

    it('leavepictureinpicture event sets isActive to false', () => {
        const { result } = renderHook(() => usePictureInPicture(videoRef));

        act(() => {
            videoEl.dispatchEvent(new Event('enterpictureinpicture'));
        });

        act(() => {
            videoEl.dispatchEvent(new Event('leavepictureinpicture'));
        });

        expect(result.current.isActive).toBe(false);
    });

    it('does nothing when videoRef is null', async () => {
        const nullRef = { current: null };
        const { result } = renderHook(() => usePictureInPicture(nullRef));

        await act(async () => {
            await result.current.togglePiP();
        });

        expect(videoEl.requestPictureInPicture).not.toHaveBeenCalled();
    });
});
