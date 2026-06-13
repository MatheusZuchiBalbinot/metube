// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { useVideo } from '@hooks/useVideo';
import videoSlice from '@store/videoSlice';
import videoUiSlice from '@store/videoUiSlice';
import authSlice from '@store/authSlice';
import themeSlice from '@store/themeSlice';
import toastSlice from '@store/toastSlice';
import subscriptionSlice from '@store/subscriptionSlice';
import playlistSlice from '@store/playlistSlice';
import searchSlice from '@store/searchSlice';
import commentSlice from '@store/commentSlice';
import { makeVideo, vid, makeVideoState } from '../helpers/factories';

vi.mock('@api/videos', () => ({
    video: {
        toggleLike: vi.fn().mockResolvedValue(undefined),
        toggleDislike: vi.fn().mockResolvedValue(undefined),
    },
    toVuid: (id: string) => id,
}));

import { video as videoApi } from '@api/videos';

function makeStore(preloaded = {}) {
    return configureStore({
        reducer: {
            video: videoSlice.reducer,
            videoUi: videoUiSlice.reducer,
            auth: authSlice.reducer,
            theme: themeSlice.reducer,
            toast: toastSlice.reducer,
            subscription: subscriptionSlice.reducer,
            playlist: playlistSlice.reducer,
            search: searchSlice.reducer,
            comment: commentSlice.reducer,
        },
        preloadedState: preloaded,
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
            Provider,
            { store },
            React.createElement(MemoryRouter, null, children),
        );
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useVideo', () => {
    describe('addVideo', () => {
        it('adds video to the store', () => {
            const store = makeStore();
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });
            const v = makeVideo({ id: vid('v-new'), title: 'New Video' });

            act(() => {
                result.current.addVideo(v);
            });

            expect(result.current.videos.some(x => x.id === vid('v-new'))).toBe(true);
        });
    });

    describe('editVideo', () => {
        it('updates an existing video in the store', () => {
            const v = makeVideo({ id: vid('v-edit'), title: 'Old Title' });
            const store = makeStore({ video: makeVideoState({ videos: [v] }) });
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });

            act(() => {
                result.current.editVideo(vid('v-edit'), { title: 'Updated Title' });
            });

            const updated = result.current.videos.find(x => x.id === vid('v-edit'));
            expect(updated?.title).toBe('Updated Title');
        });
    });

    describe('deleteVideo', () => {
        it('removes video from the store', () => {
            const v = makeVideo({ id: vid('v-del') });
            const store = makeStore({ video: makeVideoState({ videos: [v] }) });
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });

            act(() => {
                result.current.deleteVideo(vid('v-del'));
            });

            expect(result.current.videos.some(x => x.id === vid('v-del'))).toBe(false);
        });
    });

    describe('likeVideo', () => {
        it('adds videoId to likedVideos optimistically', () => {
            const v = makeVideo({ id: vid('v-like') });
            const store = makeStore({ video: makeVideoState({ videos: [v] }) });
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });

            act(() => {
                result.current.likeVideo(vid('v-like'));
            });

            expect(result.current.likedVideos.has(vid('v-like'))).toBe(true);
            expect(videoApi.toggleLike).toHaveBeenCalled();
        });

        it('rolls back on API failure', async () => {
            vi.mocked(videoApi.toggleLike).mockRejectedValue(new Error('API Error'));
            const v = makeVideo({ id: vid('v-rollback') });
            const store = makeStore({ video: makeVideoState({ videos: [v] }) });
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });

            await act(async () => {
                result.current.likeVideo(vid('v-rollback'));
                await new Promise(r => setTimeout(r, 10));
            });

            expect(result.current.likedVideos.has(vid('v-rollback'))).toBe(false);
        });
    });

    describe('watchVideo', () => {
        it('adds videoId to watchHistory', () => {
            const v = makeVideo({ id: vid('v-watch') });
            const store = makeStore({ video: makeVideoState({ videos: [v] }) });
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });

            act(() => {
                result.current.watchVideo(vid('v-watch'));
            });

            expect(result.current.watchHistory).toContain(vid('v-watch'));
        });
    });

    describe('openUploadModal / closeUploadModal', () => {
        it('toggles uploadModalOpen', () => {
            const store = makeStore();
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });

            act(() => {
                result.current.openUploadModal();
            });
            expect(result.current.uploadModalOpen).toBe(true);

            act(() => {
                result.current.closeUploadModal();
            });
            expect(result.current.uploadModalOpen).toBe(false);
        });
    });

    describe('setAutoplay', () => {
        it('updates autoplay flag', () => {
            const store = makeStore({ video: makeVideoState({ autoplay: true }) });
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });

            act(() => {
                result.current.setAutoplay(false);
            });

            expect(result.current.autoplay).toBe(false);
        });
    });

    describe('updateProgress', () => {
        it('stores percent for videoId', () => {
            const v = makeVideo({ id: vid('v-prog') });
            const store = makeStore({ video: makeVideoState({ videos: [v] }) });
            const { result } = renderHook(() => useVideo(), { wrapper: wrapper(store) });

            act(() => {
                result.current.updateProgress(vid('v-prog'), 75);
            });

            expect(result.current.videoProgress[vid('v-prog')]).toBe(75);
        });
    });
});
