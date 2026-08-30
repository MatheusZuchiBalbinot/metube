// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRecommendedFeed } from '@pages/recommended/hooks/useRecommendedFeed';
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

describe('useRecommendedFeed', () => {
    beforeEach(() => {
        recommendationsSpy.mockReset();
    });

    it('loads recommendations into the store on mount', async () => {
        const items = [makeVideo({ id: vid('v1') })];
        recommendationsSpy.mockResolvedValue(items);
        const store = makeStore();

        renderHook(() => useRecommendedFeed(), { wrapper: wrapper(store) });

        await waitFor(() => expect(recommendationsSpy).toHaveBeenCalledWith(1));
        await waitFor(() => expect(store.getState().video.serverRecommendations).toEqual(items));
        expect(store.getState().video.recommendationsLoading).toBe(false);
    });

    it('sets recommendationsLoading true while the request is in flight', async () => {
        let resolveFn: (v: ReturnType<typeof makeVideo>[]) => void = () => {};
        recommendationsSpy.mockReturnValue(new Promise(res => {
            resolveFn = res;
        }));
        const store = makeStore();

        renderHook(() => useRecommendedFeed(), { wrapper: wrapper(store) });

        await waitFor(() => expect(store.getState().video.recommendationsLoading).toBe(true));
        resolveFn([]);
        await waitFor(() => expect(store.getState().video.recommendationsLoading).toBe(false));
    });
});
