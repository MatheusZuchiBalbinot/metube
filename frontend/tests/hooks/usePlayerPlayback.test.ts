// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerPlayback } from '@hooks/usePlayerPlayback';

function makeVideoRef() {
    const el = document.createElement('video');
    Object.defineProperty(el, 'paused', { get: () => true, configurable: true });
    el.play = vi.fn().mockResolvedValue(undefined);
    el.pause = vi.fn();
    return { ref: { current: el }, el };
}

describe('usePlayerPlayback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('initialises with sensible defaults', () => {
        const { ref } = makeVideoRef();
        const { result } = renderHook(() => usePlayerPlayback(ref, { callbacks: {} }));

        expect(result.current.isPlaying).toBe(false);
        expect(result.current.isMuted).toBe(false);
        expect(result.current.volume).toBe(1);
        expect(result.current.playbackRate).toBe(1);
    });

    it('handleTogglePlay calls play() when paused', () => {
        const { ref, el } = makeVideoRef();
        Object.defineProperty(el, 'paused', { get: () => true, configurable: true });
        const { result } = renderHook(() => usePlayerPlayback(ref, { callbacks: {} }));

        act(() => {
            result.current.handleTogglePlay();
        });

        expect(el.play).toHaveBeenCalled();
    });

    it('handleTogglePlay calls pause() when playing', () => {
        const { ref, el } = makeVideoRef();
        Object.defineProperty(el, 'paused', { get: () => false, configurable: true });
        const { result } = renderHook(() => usePlayerPlayback(ref, { callbacks: {} }));

        act(() => {
            result.current.handleTogglePlay();
        });

        expect(el.pause).toHaveBeenCalled();
    });

    it('handleTogglePlay does nothing when videoRef is null', () => {
        const nullRef = { current: null };
        const { result } = renderHook(() => usePlayerPlayback(nullRef, { callbacks: {} }));

        expect(() => {
            act(() => {
                result.current.handleTogglePlay();
            });
        }).not.toThrow();
    });

    it('handleVideoPlay sets isPlaying to true', () => {
        const { ref } = makeVideoRef();
        const scheduleHide = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: {}, scheduleHideControls: scheduleHide }),
        );

        act(() => {
            result.current.handleVideoPlay();
        });

        expect(result.current.isPlaying).toBe(true);
        expect(scheduleHide).toHaveBeenCalled();
    });

    it('handleVideoPause sets isPlaying to false', () => {
        const { ref } = makeVideoRef();
        const forceShow = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: {}, forceShowControls: forceShow }),
        );

        act(() => {
            result.current.setIsPlaying(true);
            result.current.handleVideoPause();
        });

        expect(result.current.isPlaying).toBe(false);
        expect(forceShow).toHaveBeenCalled();
    });

    it('applyVolume updates volume and muted state', () => {
        const { ref, el } = makeVideoRef();
        const { result } = renderHook(() => usePlayerPlayback(ref, { callbacks: {} }));

        act(() => {
            result.current.applyVolume(0.5);
        });

        expect(result.current.volume).toBe(0.5);
        expect(result.current.isMuted).toBe(false);
        expect(el.volume).toBe(0.5);
    });

    it('applyVolume(0) mutes the video', () => {
        const { ref, el } = makeVideoRef();
        const { result } = renderHook(() => usePlayerPlayback(ref, { callbacks: {} }));

        act(() => {
            result.current.applyVolume(0);
        });

        expect(result.current.isMuted).toBe(true);
        expect(el.muted).toBe(true);
    });

    it('applyMuteToggle toggles muted state', () => {
        const { ref, el } = makeVideoRef();
        const { result } = renderHook(() => usePlayerPlayback(ref, { callbacks: {} }));

        act(() => {
            result.current.applyMuteToggle();
        });

        expect(result.current.isMuted).toBe(true);
        expect(el.muted).toBe(true);

        act(() => {
            result.current.applyMuteToggle();
        });

        expect(result.current.isMuted).toBe(false);
    });

    it('applyPlaybackRate sets rate on element and state', () => {
        const { ref, el } = makeVideoRef();
        const { result } = renderHook(() => usePlayerPlayback(ref, { callbacks: {} }));

        act(() => {
            result.current.applyPlaybackRate(2);
        });

        expect(result.current.playbackRate).toBe(2);
        expect(el.playbackRate).toBe(2);
    });

    it('handleVideoEnded sets isPlaying false and calls onEnded', () => {
        const { ref } = makeVideoRef();
        const onEnded = vi.fn();
        const forceShow = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: { onEnded }, forceShowControls: forceShow }),
        );

        act(() => {
            result.current.setIsPlaying(true);
            result.current.handleVideoEnded();
        });

        expect(result.current.isPlaying).toBe(false);
        expect(onEnded).toHaveBeenCalled();
    });

    it('handleVideoLoadedMetadata reads duration from element', () => {
        const { ref, el } = makeVideoRef();
        Object.defineProperty(el, 'duration', { get: () => 120, configurable: true });
        const onMeta = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: { onLoadedMetadata: onMeta } }),
        );

        act(() => {
            result.current.handleVideoLoadedMetadata();
        });

        expect(result.current.duration).toBe(120);
        expect(onMeta).toHaveBeenCalled();
    });

    it('controlledMuted syncs muted state to element', () => {
        const { ref, el } = makeVideoRef();
        const { rerender } = renderHook(
            ({ muted }: { muted: boolean }) =>
                usePlayerPlayback(ref, { callbacks: {}, controlledMuted: muted }),
            { initialProps: { muted: false } },
        );

        act(() => {
            rerender({ muted: true });
        });

        expect(el.muted).toBe(true);
    });

    it('controlledVolume syncs volume to element', () => {
        const { ref, el } = makeVideoRef();
        const { rerender } = renderHook(
            ({ vol }: { vol: number }) =>
                usePlayerPlayback(ref, { callbacks: {}, controlledVolume: vol }),
            { initialProps: { vol: 0.5 } },
        );

        act(() => {
            rerender({ vol: 0.8 });
        });

        expect(el.volume).toBe(0.8);
    });

    it('handleVideoEnded clears playing state and fires onEnded callback', () => {
        const { ref } = makeVideoRef();
        const onEnded = vi.fn();
        const forceShow = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, {
                callbacks: { onEnded },
                forceShowControls: forceShow,
            }),
        );

        act(() => {
            result.current.handleVideoEnded();
        });

        expect(result.current.isPlaying).toBe(false);
        expect(onEnded).toHaveBeenCalled();
        expect(forceShow).toHaveBeenCalled();
    });

    it('handleVideoTimeUpdate updates state and calls onTimeUpdate callback', () => {
        const { ref, el } = makeVideoRef();
        Object.defineProperty(el, 'currentTime', { get: () => 42, configurable: true });
        const onTimeUpdate = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: { onTimeUpdate } }),
        );

        act(() => {
            result.current.handleVideoTimeUpdate();
        });

        expect(result.current.currentTime).toBe(42);
        expect(onTimeUpdate).toHaveBeenCalled();
    });

    it('handleVideoTimeUpdate is a no-op when videoRef.current is null', () => {
        const onTimeUpdate = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback({ current: null }, { callbacks: { onTimeUpdate } }),
        );

        act(() => {
            result.current.handleVideoTimeUpdate();
        });

        expect(onTimeUpdate).not.toHaveBeenCalled();
    });

    it('handleVideoProgress updates bufferedPct based on buffered range', () => {
        const { ref, el } = makeVideoRef();
        Object.defineProperty(el, 'duration', { get: () => 100, configurable: true });
        Object.defineProperty(el, 'buffered', {
            get: () => ({
                length: 1,
                end: () => 50,
                start: () => 0,
            }),
            configurable: true,
        });

        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: {} }),
        );

        act(() => {
            result.current.handleVideoProgress();
        });

        expect(result.current.bufferedPct).toBe(50);
    });

    it('handleVideoProgress is a no-op when no buffered data is available', () => {
        const { ref, el } = makeVideoRef();
        Object.defineProperty(el, 'duration', { get: () => 0, configurable: true });
        Object.defineProperty(el, 'buffered', {
            get: () => ({ length: 0, end: () => 0, start: () => 0 }),
            configurable: true,
        });

        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: {} }),
        );

        act(() => {
            result.current.handleVideoProgress();
        });

        expect(result.current.bufferedPct).toBe(0);
    });

    it('handleVideoPlay schedules hideControls and clears buffering', () => {
        const { ref } = makeVideoRef();
        const scheduleHide = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: {}, scheduleHideControls: scheduleHide }),
        );

        act(() => {
            result.current.setIsBuffering(true);
        });
        act(() => {
            result.current.handleVideoPlay();
        });

        expect(result.current.isPlaying).toBe(true);
        expect(result.current.isBuffering).toBe(false);
        expect(scheduleHide).toHaveBeenCalled();
    });

    it('handleVideoPause forces show controls', () => {
        const { ref } = makeVideoRef();
        const forceShow = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: {}, forceShowControls: forceShow }),
        );

        act(() => {
            result.current.handleVideoPause();
        });

        expect(result.current.isPlaying).toBe(false);
        expect(forceShow).toHaveBeenCalled();
    });

    it('applyMuteToggle notifies onMuteChange callback', () => {
        const { ref } = makeVideoRef();
        const onMuteChange = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback(ref, { callbacks: {}, onMuteChange }),
        );

        act(() => {
            result.current.applyMuteToggle();
        });

        expect(onMuteChange).toHaveBeenCalledWith(true);
    });

    it('handleTogglePlay is a no-op when videoRef.current is null', () => {
        const { result } = renderHook(() =>
            usePlayerPlayback({ current: null }, { callbacks: {} }),
        );

        expect(() => {
            act(() => {
                result.current.handleTogglePlay();
            });
        }).not.toThrow();
    });

    it('applyMuteToggle is a no-op when videoRef.current is null', () => {
        const onMuteChange = vi.fn();
        const { result } = renderHook(() =>
            usePlayerPlayback({ current: null }, { callbacks: {}, onMuteChange }),
        );

        act(() => {
            result.current.applyMuteToggle();
        });

        expect(onMuteChange).not.toHaveBeenCalled();
    });
});
