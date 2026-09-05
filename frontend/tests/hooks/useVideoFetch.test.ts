// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useVideoFetch } from '@hooks/useVideoFetch';
import videoSlice, { videoActions } from '@store/videoSlice';
import { VideoStatus } from '@models/video';
import { makeVideo, vid } from '../helpers/factories';
import type { Vuid } from '@api/videos';

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

    //
    // A VideoStatusUpdated WS event for a video that's only in local state
    // triggers a refetch. If the user navigates to a different video before
    // that refetch resolves, the response must be discarded — not applied on
    // top of the new page. Previously the guard compared the request's captured
    // id against the same closure variable it was captured from, which always
    // matched itself, so the stale response always "won".

    it('discards a WS-triggered refetch response after navigating to a different video', async () => {
        type Resolver = (value: { ok: true; data: ReturnType<typeof makeVideo> }) => void;
        const resolvers: Resolver[] = [];

        vi.mocked(videoApi.get).mockImplementation(
            () => new Promise(resolve => {
                resolvers.push(resolve as Resolver);
            }),
        );

        const store = makeStore();
        const { result, rerender } = renderHook(
            ({ id }: { id: string }) => useVideoFetch(id, undefined),
            { wrapper: makeWrapper(store), initialProps: { id: 'v-1' } },
        );

        // Initial fetch for v-1 (call #1) resolves — fetchedVideo now holds API data.
        await act(async () => {
            resolvers[0]({ ok: true, data: makeVideo({ id: vid('v-1'), title: 'v1-original' }) });
            await Promise.resolve();
        });
        expect(result.current.video?.title).toBe('v1-original');

        // A WS status update arrives for v-1 while it's only in local state — triggers
        // the second effect's refetch (call #2), left pending.
        act(() => {
            store.dispatch(videoActions.updateVideoStatus({ vuid: 'v-1' as unknown as Vuid, status: VideoStatus.PUBLISHED }));
        });
        expect(resolvers).toHaveLength(2);

        // The user navigates to v-2 before call #2 resolves — this starts call #3.
        rerender({ id: 'v-2' });
        expect(resolvers).toHaveLength(3);

        // The stale WS refetch for v-1 (call #2) resolves with fresh-but-stale data.
        await act(async () => {
            resolvers[1]({ ok: true, data: makeVideo({ id: vid('v-1'), title: 'v1-STALE-SHOULD-BE-DISCARDED' }) });
            await Promise.resolve();
        });
        expect(result.current.video?.title).not.toBe('v1-STALE-SHOULD-BE-DISCARDED');

        // The navigation's own fetch (call #3) resolves and is applied normally.
        await act(async () => {
            resolvers[2]({ ok: true, data: makeVideo({ id: vid('v-2'), title: 'v2-final' }) });
            await Promise.resolve();
        });
        expect(result.current.video?.id).toBe(vid('v-2'));
        expect(result.current.video?.title).toBe('v2-final');
    });
});
