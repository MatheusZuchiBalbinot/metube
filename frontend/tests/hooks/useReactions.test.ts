// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useReactions } from '@hooks/useReactions';
import videoSlice from '@store/videoSlice';
import videoUiSlice from '@store/videoUiSlice';
import playbackSlice from '@store/playbackSlice';
import toastSlice from '@store/toastSlice';
import { selectToasts } from '@store/toastSelectors';
import { makeVideoState, vid } from '../helpers/factories';

vi.mock('@api/videos', () => ({
    video: {
        toggleLike: vi.fn().mockResolvedValue(undefined),
        toggleDislike: vi.fn().mockResolvedValue(undefined),
    },
    toVuid: (id: string) => id,
}));

function makeStore(preloaded = {}) {
    return configureStore({
        reducer: {
            video: videoSlice.reducer,
            videoUi: videoUiSlice.reducer,
            playback: playbackSlice.reducer,
            toast: toastSlice.reducer,
        },
        preloadedState: preloaded,
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useReactions', () => {
    it('reflects isLiked/isDisliked from the store', () => {
        const store = makeStore({
            video: makeVideoState({ likedVideos: [vid('v1')], dislikedVideos: [] }),
        });
        const { result } = renderHook(() => useReactions(vid('v1')), { wrapper: wrapper(store) });

        expect(result.current.isLiked).toBe(true);
        expect(result.current.isDisliked).toBe(false);
    });

    it('is neither liked nor disliked when videoId is undefined', () => {
        const store = makeStore({ video: makeVideoState() });
        const { result } = renderHook(() => useReactions(undefined), { wrapper: wrapper(store) });

        expect(result.current.isLiked).toBe(false);
        expect(result.current.isDisliked).toBe(false);

        act(() => {
            result.current.handleLike();
            result.current.handleDislike();
        });
        expect(store.getState().video.likedVideos).toEqual([]);
        expect(store.getState().video.dislikedVideos).toEqual([]);
    });

    it('handleLike toggles the like in the store and triggers the burst animation', () => {
        const store = makeStore({ video: makeVideoState({ videos: [] }) });
        const { result } = renderHook(() => useReactions(vid('v1')), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleLike();
        });

        expect(store.getState().video.likedVideos).toContain(vid('v1'));
        expect(result.current.likeAnimating).toBe(true);
    });

    it('handleDislike toggles the dislike in the store and triggers the burst animation', () => {
        const store = makeStore({ video: makeVideoState({ videos: [] }) });
        const { result } = renderHook(() => useReactions(vid('v1')), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleDislike();
        });

        expect(store.getState().video.dislikedVideos).toContain(vid('v1'));
        expect(result.current.dislikeAnimating).toBe(true);
    });

    it('does not toast on like by default', () => {
        const store = makeStore({ video: makeVideoState({ videos: [] }) });
        const { result } = renderHook(() => useReactions(vid('v1')), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleLike();
        });

        expect(selectToasts(store.getState())).toHaveLength(0);
    });

    it('toasts on like when { toast: true } is passed', () => {
        const store = makeStore({ video: makeVideoState({ videos: [] }) });
        const { result } = renderHook(() => useReactions(vid('v1'), { toast: true }), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleLike();
        });

        expect(selectToasts(store.getState())).toHaveLength(1);
    });
});
