// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import videoSlice from '@store/videoSlice';
import { useVideoStatusBroadcast } from '@hooks/useVideoStatusBroadcast';
import { VideoStatus } from '@models';

vi.mock('@api/videos', () => ({
    video: { get: vi.fn() },
    toVuid: (id: string) => id,
}));

import { video as videoApi } from '@api/videos';

function makeStore() {
    return configureStore({ reducer: { video: videoSlice.reducer } });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

describe('useVideoStatusBroadcast', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('dispatches updateVideoStatus and notifies while processing', () => {
        const store = makeStore();
        const notify = vi.fn();
        const findVideoByVuid = vi.fn().mockReturnValue({ id: 'v-1', title: 'T', thumbnail: 'thumb.jpg' });
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(
            () => useVideoStatusBroadcast({ notify, tRef, findVideoByVuid }),
            { wrapper: makeWrapper(store) },
        );

        result.current({ vuid: 'v-1', status: 'processing', emitted_at_ms: 1000 });

        expect(store.getState().video.lastVideoStatusUpdate).toEqual({ vuid: 'v-1', status: 'processing' });
        expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'video.processing_toast' }));
    });

    it('refetches the full video on a terminal status', async () => {
        vi.mocked(videoApi.get).mockResolvedValue({ ok: true, data: { id: 'v-1', status: 'published' } as never });
        const store = makeStore();
        const notify = vi.fn();
        const findVideoByVuid = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(
            () => useVideoStatusBroadcast({ notify, tRef, findVideoByVuid }),
            { wrapper: makeWrapper(store) },
        );

        result.current({ vuid: 'v-1', status: 'published', emitted_at_ms: 1000 });

        await waitFor(() => {
            expect(videoApi.get).toHaveBeenCalledWith('v-1');
        });
        expect(notify).not.toHaveBeenCalled();
    });

    it('drops a broadcast delivered out of order', () => {
        const store = makeStore();
        const notify = vi.fn();
        const findVideoByVuid = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(
            () => useVideoStatusBroadcast({ notify, tRef, findVideoByVuid }),
            { wrapper: makeWrapper(store) },
        );

        result.current({ vuid: 'v-1', status: VideoStatus.PUBLISHED, emitted_at_ms: 2000 });
        result.current({ vuid: 'v-1', status: 'processing', emitted_at_ms: 1000 });

        expect(store.getState().video.lastVideoStatusUpdate).toEqual({ vuid: 'v-1', status: VideoStatus.PUBLISHED });
    });
});
