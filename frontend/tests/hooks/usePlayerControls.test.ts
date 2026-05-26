// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerControls } from '@hooks/usePlayerControls';

describe('usePlayerControls', () => {
    let videoEl: HTMLVideoElement;
    let videoRef: React.RefObject<HTMLVideoElement | null>;

    beforeEach(() => {
        vi.useFakeTimers();
        videoEl = document.createElement('video');
        videoRef = { current: videoEl };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initialises with showControls = true', () => {
        const { result } = renderHook(() => usePlayerControls(videoRef));
        expect(result.current.showControls).toBe(true);
    });

    it('forceShow keeps controls visible and cancels any pending hide', () => {
        const { result } = renderHook(() => usePlayerControls(videoRef));

        act(() => {
            result.current.scheduleHideControls();
        });

        act(() => {
            result.current.forceShow();
        });

        act(() => {
            vi.advanceTimersByTime(4000);
        });

        expect(result.current.showControls).toBe(true);
    });

    it('scheduleHideControls hides controls after delay when video is playing', () => {
        Object.defineProperty(videoEl, 'paused', { get: () => false, configurable: true });

        const { result } = renderHook(() => usePlayerControls(videoRef));

        act(() => {
            result.current.scheduleHideControls();
        });

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.showControls).toBe(false);
    });

    it('scheduleHideControls does not hide controls when video is paused', () => {
        Object.defineProperty(videoEl, 'paused', { get: () => true, configurable: true });

        const { result } = renderHook(() => usePlayerControls(videoRef));

        act(() => {
            result.current.scheduleHideControls();
        });

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.showControls).toBe(true);
    });

    it('revealControls shows controls and re-schedules hide', () => {
        Object.defineProperty(videoEl, 'paused', { get: () => false, configurable: true });
        const { result } = renderHook(() => usePlayerControls(videoRef));

        act(() => {
            result.current.setShowControls(false);
        });

        act(() => {
            result.current.revealControls();
        });

        expect(result.current.showControls).toBe(true);

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.showControls).toBe(false);
    });

    it('cancelHide prevents the scheduled hide from firing', () => {
        Object.defineProperty(videoEl, 'paused', { get: () => false, configurable: true });
        const { result } = renderHook(() => usePlayerControls(videoRef));

        act(() => {
            result.current.scheduleHideControls();
            result.current.cancelHide();
        });

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.showControls).toBe(true);
    });
});
