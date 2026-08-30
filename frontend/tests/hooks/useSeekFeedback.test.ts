// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeekFeedback } from '@hooks/useSeekFeedback';

function makeVideoRef() {
    const el = document.createElement('video');
    return { current: el as HTMLVideoElement | null };
}

describe('useSeekFeedback', () => {
    it('starts with no seeking index', () => {
        const videoRef = makeVideoRef();
        const { result } = renderHook(() => useSeekFeedback(videoRef));

        expect(result.current.seekingIndex).toBeNull();
    });

    it('sets seekingIndex and calls seek when triggered', () => {
        const videoRef = makeVideoRef();
        const seek = vi.fn();
        const { result } = renderHook(() => useSeekFeedback(videoRef));

        act(() => {
            result.current.seekToIndex(2, seek);
        });

        expect(result.current.seekingIndex).toBe(2);
        expect(seek).toHaveBeenCalledTimes(1);
    });

    it('clears seekingIndex once the video reports "seeked"', () => {
        const videoRef = makeVideoRef();
        const { result } = renderHook(() => useSeekFeedback(videoRef));

        act(() => {
            result.current.seekToIndex(0, () => undefined);
        });
        expect(result.current.seekingIndex).toBe(0);

        act(() => {
            videoRef.current!.dispatchEvent(new Event('seeked'));
        });

        expect(result.current.seekingIndex).toBeNull();
    });

    it('replaces a pending seek when a new one starts before the previous "seeked" fires', () => {
        const videoRef = makeVideoRef();
        const { result } = renderHook(() => useSeekFeedback(videoRef));

        act(() => {
            result.current.seekToIndex(0, () => undefined);
        });
        act(() => {
            result.current.seekToIndex(1, () => undefined);
        });

        expect(result.current.seekingIndex).toBe(1);

        // The stale listener from the first seek must have been removed — firing
        // "seeked" now resolves the second (current) seek, not a leftover no-op.
        act(() => {
            videoRef.current!.dispatchEvent(new Event('seeked'));
        });

        expect(result.current.seekingIndex).toBeNull();
    });

    it('clears seekingIndex immediately when there is no video element', () => {
        const videoRef = { current: null };
        const { result } = renderHook(() => useSeekFeedback(videoRef));

        act(() => {
            result.current.seekToIndex(0, () => undefined);
        });

        expect(result.current.seekingIndex).toBeNull();
    });

    it('removes the "seeked" listener on unmount so it cannot fire after unmount', () => {
        const videoRef = makeVideoRef();
        const removeSpy = vi.spyOn(videoRef.current!, 'removeEventListener');
        const { result, unmount } = renderHook(() => useSeekFeedback(videoRef));

        act(() => {
            result.current.seekToIndex(0, () => undefined);
        });

        unmount();

        expect(removeSpy).toHaveBeenCalledWith('seeked', expect.any(Function));
    });
});
