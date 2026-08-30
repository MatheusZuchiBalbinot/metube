// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useInfiniteRecommendations } from '@pages/home/hooks/useInfiniteRecommendations';
import videoSlice from '@store/videoSlice';
import { makeVideo, makeVideoState, vid } from '../../../helpers/factories';

const recommendationsSpy = vi.hoisted(() => vi.fn());
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        video: { recommendations: recommendationsSpy },
    };
});

function makeStore() {
    return configureStore({
        reducer: { video: videoSlice.reducer },
        preloadedState: { video: makeVideoState({ videos: [] }) },
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

describe('useInfiniteRecommendations', () => {
    beforeEach(() => {
        recommendationsSpy.mockReset();
    });

    it('loads page 1 into serverRecommendations on mount', async () => {
        const items = [makeVideo({ id: vid('v1') })];
        recommendationsSpy.mockResolvedValue(items);
        const store = makeStore();

        const { result } = renderHook(() => useInfiniteRecommendations(), { wrapper: wrapper(store) });

        await waitFor(() => expect(recommendationsSpy).toHaveBeenCalledWith(1));
        await waitFor(() => expect(store.getState().video.serverRecommendations).toEqual(items));
        expect(result.current.hasMore).toBe(true);
    });

    it('sets hasMore = false when the first page is empty', async () => {
        recommendationsSpy.mockResolvedValue([]);
        const store = makeStore();

        const { result } = renderHook(() => useInfiniteRecommendations(), { wrapper: wrapper(store) });

        await waitFor(() => expect(result.current.hasMore).toBe(false));
    });

    it('loadMore appends the next page and advances the page counter', async () => {
        recommendationsSpy.mockResolvedValueOnce([makeVideo({ id: vid('v1') })]);
        const store = makeStore();
        const { result } = renderHook(() => useInfiniteRecommendations(), { wrapper: wrapper(store) });
        await waitFor(() => expect(store.getState().video.serverRecommendations).toHaveLength(1));

        recommendationsSpy.mockResolvedValueOnce([makeVideo({ id: vid('v2') })]);
        await act(async () => {
            await result.current.loadMore();
        });

        expect(recommendationsSpy).toHaveBeenLastCalledWith(2);
        expect(store.getState().video.serverRecommendations.map(v => v.id)).toEqual([vid('v1'), vid('v2')]);
    });

    it('loadMore sets hasMore = false when a page returns no items', async () => {
        recommendationsSpy.mockResolvedValueOnce([makeVideo({ id: vid('v1') })]);
        const store = makeStore();
        const { result } = renderHook(() => useInfiniteRecommendations(), { wrapper: wrapper(store) });
        await waitFor(() => expect(result.current.hasMore).toBe(true));

        recommendationsSpy.mockResolvedValueOnce([]);
        await act(async () => {
            await result.current.loadMore();
        });

        expect(result.current.hasMore).toBe(false);
    });

    it('loadMore is a no-op once hasMore is false', async () => {
        recommendationsSpy.mockResolvedValueOnce([]);
        const store = makeStore();
        const { result } = renderHook(() => useInfiniteRecommendations(), { wrapper: wrapper(store) });
        await waitFor(() => expect(result.current.hasMore).toBe(false));

        recommendationsSpy.mockClear();
        await act(async () => {
            await result.current.loadMore();
        });

        expect(recommendationsSpy).not.toHaveBeenCalled();
    });
});
