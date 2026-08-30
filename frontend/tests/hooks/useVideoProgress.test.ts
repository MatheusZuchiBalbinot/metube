// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useVideoProgress } from '@hooks/useVideoProgress';
import videoSlice from '@store/videoSlice';
import { vid } from '../helpers/factories';

function makeStore(preloaded = {}) {
    return configureStore({
        reducer: { video: videoSlice.reducer },
        preloadedState: preloaded,
    });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

function makeVideoRef(currentTime = 0, duration = 0) {
    const el = document.createElement('video');
    el.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(el, 'currentTime', {
        get: () => currentTime,
        set: (v: number) => {
            currentTime = v;
        },
        configurable: true,
    });
    Object.defineProperty(el, 'duration', {
        get: () => duration,
        configurable: true,
    });
    return { ref: { current: el }, el };
}

describe('useVideoProgress', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('handleTimeUpdate calls updateProgress when throttle allows', () => {
        const { ref } = makeVideoRef(30, 100);
        const updateProgress = vi.fn();
        const store = makeStore();
        const id = vid('v-tp');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: ref,
            updateProgress,
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleTimeUpdate();
        });

        expect(updateProgress).toHaveBeenCalledWith(id, 30);
    });

    it('handleTimeUpdate throttles repeated calls within 3 seconds', () => {
        const { ref } = makeVideoRef(30, 100);
        const updateProgress = vi.fn();
        const store = makeStore();
        const id = vid('v-throttle');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: ref,
            updateProgress,
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleTimeUpdate();
        });
        act(() => {
            result.current.handleTimeUpdate();
        });

        expect(updateProgress).toHaveBeenCalledTimes(1);
    });

    it('handleVideoEnded calls updateProgress with 100 and onCompleted', () => {
        const { ref } = makeVideoRef();
        const updateProgress = vi.fn();
        const onCompleted = vi.fn();
        const onFinished = vi.fn();
        const store = makeStore();
        const id = vid('v-end');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: ref,
            updateProgress,
            consumePendingVideoSeek: () => null,
            onCompleted,
            onFinished,
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleVideoEnded();
        });

        expect(updateProgress).toHaveBeenCalledWith(id, 100);
        expect(onCompleted).toHaveBeenCalled();
        expect(onFinished).toHaveBeenCalledWith(id);
    });

    it('handleLoadedMetadata reads duration from element', () => {
        const { ref } = makeVideoRef(0, 120);
        const updateProgress = vi.fn();
        const store = makeStore();
        const id = vid('v-meta');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: ref,
            updateProgress,
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleLoadedMetadata();
        });

        // Duration is stored internally; if we call handleVideoEnded the percent should be 100
        act(() => {
            result.current.handleVideoEnded();
        });

        expect(updateProgress).toHaveBeenCalledWith(id, 100);
    });

    it('handleLoadedMetadata applies pending seek from consumePendingVideoSeek', () => {
        const { ref, el: videoEl } = makeVideoRef(0, 100);
        const updateProgress = vi.fn();
        const store = makeStore();
        const id = vid('v-seek');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: ref,
            updateProgress,
            consumePendingVideoSeek: () => 45,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleLoadedMetadata();
        });

        expect(videoEl.play).toHaveBeenCalled();
    });

    it('showCompletion is only shown once even if handleVideoEnded fires twice', () => {
        vi.useFakeTimers();
        const { ref } = makeVideoRef();
        const store = makeStore();
        const id = vid('v-once');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: ref,
            updateProgress: vi.fn(),
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleVideoEnded();
        });
        expect(result.current.showCompletion).toBe(true);

        act(() => {
            result.current.handleVideoEnded();
        });

        // Still true — it was set by the first call and hasn't timed out yet
        expect(result.current.showCompletion).toBe(true);
        vi.useRealTimers();
    });

    // The hook used to fabricate a parallel "simulated"
    // progress clock for videos without a real file (e.g. a FAILED upload, which
    // is the only status that reaches this hook with no videoUrl/hlsUrl). That
    // silently marked such videos as watched and pushed fake progress to the
    // backend even though the UI shows "No video file available" and never
    // mounts a <video> element. The hook must now stay fully idle until a real
    // playback event (handleTimeUpdate/handleLoadedMetadata) fires.
    it('does not fabricate progress when no real playback event ever fires', () => {
        const updateProgress = vi.fn();
        const onBackendSync = vi.fn();
        const onCompleted = vi.fn();
        const store = makeStore();
        const id = vid('v-nofile');

        renderHook(() => useVideoProgress({
            id,
            videoRef: { current: null },
            updateProgress,
            onBackendSync,
            consumePendingVideoSeek: () => null,
            onCompleted,
        }), { wrapper: makeWrapper(store) });

        act(() => {
            vi.advanceTimersByTime(60_000);
        });

        expect(updateProgress).not.toHaveBeenCalled();
        expect(onBackendSync).not.toHaveBeenCalled();
        expect(onCompleted).not.toHaveBeenCalled();
    });

    it('does no work when id is undefined', () => {
        const { ref } = makeVideoRef(30, 100);
        const updateProgress = vi.fn();
        const store = makeStore();

        const { result } = renderHook(() => useVideoProgress({
            id: undefined,
            videoRef: ref,
            updateProgress,
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleTimeUpdate();
        });
        act(() => {
            result.current.handleVideoEnded();
        });

        expect(updateProgress).not.toHaveBeenCalled();
    });

    it('handleTimeUpdate is a no-op when videoRef.current is null', () => {
        const updateProgress = vi.fn();
        const store = makeStore();
        const id = vid('v-null');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: { current: null },
            updateProgress,
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleTimeUpdate();
        });

        expect(updateProgress).not.toHaveBeenCalled();
    });

    it('handleLoadedMetadata is a no-op when videoRef.current is null', () => {
        const updateProgress = vi.fn();
        const store = makeStore();
        const id = vid('v-no-el');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: { current: null },
            updateProgress,
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        expect(() => {
            act(() => {
                result.current.handleLoadedMetadata();
            });
        }).not.toThrow();
    });

    it('calls onBackendSync periodically while video has progress', () => {
        const { ref } = makeVideoRef(30, 100);
        const updateProgress = vi.fn();
        const onBackendSync = vi.fn();
        const store = makeStore();
        const id = vid('v-bs');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: ref,
            updateProgress,
            onBackendSync,
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleLoadedMetadata();
            result.current.handleTimeUpdate();
        });

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(onBackendSync).toHaveBeenCalled();
        expect(onBackendSync).toHaveBeenCalledWith(id, expect.any(Number));
    });

    it('getCurrentTime returns the latest known position', () => {
        const { ref } = makeVideoRef(42, 100);
        const updateProgress = vi.fn();
        const store = makeStore();
        const id = vid('v-now');

        const { result } = renderHook(() => useVideoProgress({
            id,
            videoRef: ref,
            updateProgress,
            consumePendingVideoSeek: () => null,
            onCompleted: vi.fn(),
        }), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleTimeUpdate();
        });

        expect(result.current.getCurrentTime()).toBe(42);
    });
});
