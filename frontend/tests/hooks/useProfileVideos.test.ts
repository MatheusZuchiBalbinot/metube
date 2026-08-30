// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useProfileVideos } from '@hooks/useProfileVideos';
import videoSlice, { videoActions } from '@store/videoSlice';
import { VideoStatus } from '@models';
import { makeVideo, vid } from '../helpers/factories';

vi.mock('@api', () => ({
    channel: { videos: vi.fn() },
    toUuid: (id: string) => id,
}));

import { channel as channelApi } from '@api';

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

describe('useProfileVideos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts in loading state and resolves to ok with fetched videos', async () => {
        const videos = [makeVideo({ id: vid('v-1') }), makeVideo({ id: vid('v-2') })];
        vi.mocked(channelApi.videos).mockResolvedValue({
            ok: true,
            data: { data: videos, meta: { page: 1, lastPage: 1, total: 2 } },
        } as Awaited<ReturnType<typeof channelApi.videos>>);

        const store = makeStore();
        const { result } = renderHook(
            () => useProfileVideos('ch-1', false),
            { wrapper: makeWrapper(store) },
        );

        expect(result.current.videosState.kind).toBe('loading');

        await waitFor(() => {
            expect(result.current.videosState.kind).toBe('ok');
        });

        if (result.current.videosState.kind === 'ok') {
            expect(result.current.videosState.data).toHaveLength(2);
        }
    });

    it('stays in loading state if API never resolves', async () => {
        vi.mocked(channelApi.videos).mockReturnValue(new Promise(() => {
            // never resolves
        }));

        const store = makeStore();
        const { result } = renderHook(
            () => useProfileVideos('ch-2', false),
            { wrapper: makeWrapper(store) },
        );

        expect(result.current.videosState.kind).toBe('loading');
    });

    it('setVideos updates the loaded videos array', async () => {
        const videos = [makeVideo({ id: vid('v-orig') })];
        vi.mocked(channelApi.videos).mockResolvedValue({
            ok: true,
            data: { data: videos, meta: { page: 1, lastPage: 1, total: 1 } },
        } as Awaited<ReturnType<typeof channelApi.videos>>);

        const store = makeStore();
        const { result } = renderHook(
            () => useProfileVideos('ch-3', false),
            { wrapper: makeWrapper(store) },
        );

        await waitFor(() => {
            expect(result.current.videosState.kind).toBe('ok');
        });

        act(() => {
            result.current.setVideos(prev => [...prev, makeVideo({ id: vid('v-added') })]);
        });

        if (result.current.videosState.kind === 'ok') {
            expect(result.current.videosState.data).toHaveLength(2);
        }
    });

    it('setVideos is a no-op when not in loaded state', () => {
        vi.mocked(channelApi.videos).mockReturnValue(new Promise(() => {
            // never resolves
        }));

        const store = makeStore();
        const { result } = renderHook(
            () => useProfileVideos('ch-4', false),
            { wrapper: makeWrapper(store) },
        );

        act(() => {
            result.current.setVideos(prev => [...prev, makeVideo()]);
        });

        expect(result.current.videosState.kind).toBe('loading');
    });

    it('refetches when lastVideoStatusUpdate changes for own profile', async () => {
        const original = makeVideo({ id: vid('v-ws'), status: VideoStatus.PROCESSING });
        vi.mocked(channelApi.videos).mockResolvedValue({
            ok: true,
            data: { data: [original], meta: { page: 1, lastPage: 1, total: 1 } },
        } as Awaited<ReturnType<typeof channelApi.videos>>);

        const store = makeStore();
        renderHook(
            () => useProfileVideos('ch-5', true),
            { wrapper: makeWrapper(store) },
        );

        await waitFor(() => {
            expect(channelApi.videos).toHaveBeenCalledTimes(1);
        });

        await act(async () => {
            store.dispatch(videoActions.updateVideoStatus({
                vuid: 'v-ws' as unknown as Parameters<typeof videoActions.updateVideoStatus>[0]['vuid'],
                status: VideoStatus.PUBLISHED,
            }));
        });

        await waitFor(() => {
            expect(channelApi.videos).toHaveBeenCalledTimes(2);
        });
    });
});
