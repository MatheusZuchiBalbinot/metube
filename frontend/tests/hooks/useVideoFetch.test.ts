// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useVideoFetch } from '@hooks/useVideoFetch';
import videoSlice from '@store/videoSlice';
import { VideoStatus } from '@models/video';
import { makeVideo, vid } from '../helpers/factories';

vi.mock('@api/videos', () => ({
    video: {
        get: vi.fn(),
    },
    toVuid: (id: string) => id,
}));

import { video as videoApi } from '@api/videos';

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

describe('useVideoFetch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns storeVideo directly when available in store', () => {
        const storeVideo = makeVideo({ id: vid('v-store') });
        const store = makeStore();
        const { result } = renderHook(
            () => useVideoFetch('v-store', storeVideo),
            { wrapper: makeWrapper(store) },
        );

        expect(result.current.video).toBe(storeVideo);
        expect(result.current.fetchFailed).toBe(false);
        expect(videoApi.get).not.toHaveBeenCalled();
    });

    it('fetches from API when storeVideo is undefined', async () => {
        const fetched = makeVideo({ id: vid('v-fetched') });
        vi.mocked(videoApi.get).mockResolvedValue({ ok: true, data: fetched });

        const store = makeStore();
        const { result } = renderHook(
            () => useVideoFetch('v-fetched', undefined),
            { wrapper: makeWrapper(store) },
        );

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.video?.id).toBe(vid('v-fetched'));
        expect(result.current.fetchFailed).toBe(false);
    });

    it('sets fetchFailed when API returns error', async () => {
        vi.mocked(videoApi.get).mockResolvedValue({ ok: false, error: 'Not found' });

        const store = makeStore();
        const { result } = renderHook(
            () => useVideoFetch('v-bad', undefined),
            { wrapper: makeWrapper(store) },
        );

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.fetchFailed).toBe(true);
        expect(result.current.video).toBeUndefined();
    });

    it('returns undefined when id is undefined', () => {
        const store = makeStore();
        const { result } = renderHook(
            () => useVideoFetch(undefined, undefined),
            { wrapper: makeWrapper(store) },
        );

        expect(result.current.video).toBeUndefined();
        expect(videoApi.get).not.toHaveBeenCalled();
    });

    it('polls every 5s when video is in PROCESSING state', async () => {
        vi.useFakeTimers();
        const processing = makeVideo({ id: vid('v-proc'), status: VideoStatus.PROCESSING });
        vi.mocked(videoApi.get).mockResolvedValue({ ok: true, data: processing });

        const store = makeStore();
        renderHook(
            () => useVideoFetch('v-proc', processing),
            { wrapper: makeWrapper(store) },
        );

        expect(videoApi.get).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(5000);
            await Promise.resolve();
        });

        expect(videoApi.get).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('dispatches updateVideo when poll finds a transition to published', async () => {
        vi.useFakeTimers();
        const processing = makeVideo({ id: vid('v-done'), status: VideoStatus.PROCESSING });
        const published = makeVideo({ id: vid('v-done'), status: VideoStatus.PUBLISHED });
        vi.mocked(videoApi.get).mockResolvedValue({ ok: true, data: published });

        const store = makeStore();
        const dispatchSpy = vi.spyOn(store, 'dispatch');

        renderHook(
            () => useVideoFetch('v-done', processing),
            { wrapper: makeWrapper(store) },
        );

        await act(async () => {
            vi.advanceTimersByTime(5000);
            await Promise.resolve();
        });

        expect(videoApi.get).toHaveBeenCalled();
        const updateCalls = dispatchSpy.mock.calls.filter(
            ([action]) => typeof action === 'object' && action !== null && 'type' in action && (action as { type: string }).type === 'video/updateVideo',
        );
        expect(updateCalls.length).toBeGreaterThan(0);
        vi.useRealTimers();
    });
});
