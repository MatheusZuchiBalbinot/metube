// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useVideoReactions } from '@pages/video/hooks/useVideoReactions';
import videoSlice from '@store/videoSlice';
import videoUiSlice from '@store/videoUiSlice';
import playbackSlice from '@store/playbackSlice';
import toastSlice from '@store/toastSlice';
import { selectToasts } from '@store/toastSelectors';
import { makeVideoState, vid } from '../../../helpers/factories';

vi.mock('@api/videos', () => ({
    video: {
        toggleLike: vi.fn().mockResolvedValue(undefined),
        toggleDislike: vi.fn().mockResolvedValue(undefined),
    },
    toVuid: (id: string) => id,
}));

function makeStore() {
    return configureStore({
        reducer: {
            video: videoSlice.reducer,
            videoUi: videoUiSlice.reducer,
            playback: playbackSlice.reducer,
            toast: toastSlice.reducer,
        },
        preloadedState: { video: makeVideoState({ videos: [] }) },
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

describe('useVideoReactions', () => {
    // Legacy params (likedVideos/dislikedVideos/likeVideo/dislikeVideo) are accepted
    // for call-site compatibility but not read — the hook sources Redux itself.
    const legacyParams = {
        likedVideos: new Set<ReturnType<typeof vid>>(),
        dislikedVideos: new Set<ReturnType<typeof vid>>(),
        likeVideo: vi.fn(),
        dislikeVideo: vi.fn(),
    };

    it('delegates to the shared reactions state', () => {
        const store = makeStore();
        const { result } = renderHook(
            () => useVideoReactions({ videoId: vid('v1'), ...legacyParams }),
            { wrapper: wrapper(store) },
        );

        act(() => {
            result.current.handleLike();
        });

        expect(store.getState().video.likedVideos).toContain(vid('v1'));
    });

    it('toasts on like (video page always toasts)', () => {
        const store = makeStore();
        const { result } = renderHook(
            () => useVideoReactions({ videoId: vid('v1'), ...legacyParams }),
            { wrapper: wrapper(store) },
        );

        act(() => {
            result.current.handleLike();
        });

        expect(selectToasts(store.getState())).toHaveLength(1);
    });
});
