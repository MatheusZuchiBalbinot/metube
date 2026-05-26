// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useBootstrap } from '@hooks/useBootstrap';
import videoSlice from '@store/videoSlice';
import playlistSlice from '@store/playlistSlice';
import authSlice from '@store/authSlice';
import { makeUser, makeVideo, vid } from '../helpers/factories';

vi.mock('@api', () => ({
    video: { list: vi.fn() },
    interactions: { liked: vi.fn() },
    playlist: { list: vi.fn() },
    history: { progress: vi.fn() },
}));

import { video as videoApi, interactions, playlist, history } from '@api';

function makeStore(user: ReturnType<typeof makeUser> | null = null) {
    return configureStore({
        reducer: {
            video: videoSlice.reducer,
            playlist: playlistSlice.reducer,
            auth: authSlice.reducer,
        },
        preloadedState: {
            auth: { user, loading: false, sessionError: null },
        },
    });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

describe('useBootstrap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(videoApi.list).mockResolvedValue({
            ok: true,
            data: { data: [], meta: { page: 1, lastPage: 1, total: 0 } },
        } as Awaited<ReturnType<typeof videoApi.list>>);
        vi.mocked(interactions.liked).mockResolvedValue({
            ok: true,
            data: { data: [], meta: { page: 1, lastPage: 1, total: 0 } },
        } as Awaited<ReturnType<typeof interactions.liked>>);
        vi.mocked(playlist.list).mockResolvedValue({
            ok: true,
            data: [],
        } as Awaited<ReturnType<typeof playlist.list>>);
        vi.mocked(history.progress).mockResolvedValue(null as Awaited<ReturnType<typeof history.progress>>);
    });

    it('fetches public videos but skips user-specific data when no user is authenticated', async () => {
        const store = makeStore(null);
        renderHook(() => useBootstrap(), { wrapper: makeWrapper(store) });

        await new Promise(res => setTimeout(res, 10));

        expect(videoApi.list).toHaveBeenCalledWith({ status: 'published' });
        expect(interactions.liked).not.toHaveBeenCalled();
        expect(playlist.list).not.toHaveBeenCalled();
        expect(history.progress).not.toHaveBeenCalled();
    });

    it('fetches videos, liked, playlists and progress when user is authenticated', async () => {
        const user = makeUser({ id: 'u-1' });
        const store = makeStore(user);
        renderHook(() => useBootstrap(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(videoApi.list).toHaveBeenCalled();
            expect(interactions.liked).toHaveBeenCalled();
            expect(playlist.list).toHaveBeenCalled();
            expect(history.progress).toHaveBeenCalled();
        });
    });

    it('hydrates videos into the store when videoApi.list succeeds', async () => {
        const fetched = [makeVideo({ id: vid('v-1') }), makeVideo({ id: vid('v-2') })];
        vi.mocked(videoApi.list).mockResolvedValue({
            ok: true,
            data: { data: fetched, meta: { page: 1, lastPage: 1, total: 2 } },
        } as Awaited<ReturnType<typeof videoApi.list>>);

        const store = makeStore(makeUser());
        renderHook(() => useBootstrap(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(store.getState().video.videos.length).toBe(2);
        });
    });

    it('hydrates liked video IDs into the store', async () => {
        const liked = [makeVideo({ id: vid('v-liked') })];
        vi.mocked(interactions.liked).mockResolvedValue({
            ok: true,
            data: { data: liked, meta: { page: 1, lastPage: 1, total: 1 } },
        } as Awaited<ReturnType<typeof interactions.liked>>);

        const store = makeStore(makeUser());
        renderHook(() => useBootstrap(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(store.getState().video.likedVideos).toContain(vid('v-liked'));
        });
    });

    it('hydrates progress when history.progress returns data', async () => {
        vi.mocked(history.progress).mockResolvedValue({ 'v-x': 50 } as Awaited<ReturnType<typeof history.progress>>);

        const store = makeStore(makeUser());
        renderHook(() => useBootstrap(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(store.getState().video.videoProgress).toBeDefined();
        });
    });
});
