// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useViewTracking } from '@pages/video/hooks/useViewTracking';
import videoSlice from '@store/videoSlice';
import { makeVideo, makeVideoState, vid } from '../../../helpers/factories';

const recordViewSpy = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const hasViewedSpy = vi.hoisted(() => vi.fn());
const markViewedSpy = vi.hoisted(() => vi.fn());

vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        video: { recordView: recordViewSpy },
        toVuid: (id: string) => id,
    };
});

vi.mock('@utils', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        hasViewed: hasViewedSpy,
        markViewed: markViewedSpy,
    };
});

function makeStore(videos = [makeVideo({ id: vid('v1'), views: 10 })]) {
    return configureStore({
        reducer: { video: videoSlice.reducer },
        preloadedState: { video: makeVideoState({ videos }) },
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

describe('useViewTracking', () => {
    beforeEach(() => {
        recordViewSpy.mockClear();
        hasViewedSpy.mockReset();
        markViewedSpy.mockReset();
    });

    it('registers a view when the video is loaded and not yet viewed this session', () => {
        hasViewedSpy.mockReturnValue(false);
        const store = makeStore();
        const watchVideo = vi.fn();

        renderHook(() => useViewTracking('v1', true, watchVideo), { wrapper: wrapper(store) });

        expect(markViewedSpy).toHaveBeenCalledWith('v1');
        expect(watchVideo).toHaveBeenCalledWith(vid('v1'));
        expect(recordViewSpy).toHaveBeenCalledWith('v1');
        expect(store.getState().video.entities[vid('v1')]?.views).toBe(11);
    });

    it('does not register a view again once already viewed this session', () => {
        hasViewedSpy.mockReturnValue(true);
        const store = makeStore();
        const watchVideo = vi.fn();

        renderHook(() => useViewTracking('v1', true, watchVideo), { wrapper: wrapper(store) });

        expect(markViewedSpy).not.toHaveBeenCalled();
        expect(watchVideo).not.toHaveBeenCalled();
        expect(recordViewSpy).not.toHaveBeenCalled();
    });

    it('does nothing while the video has not loaded yet', () => {
        hasViewedSpy.mockReturnValue(false);
        const store = makeStore();
        const watchVideo = vi.fn();

        renderHook(() => useViewTracking('v1', false, watchVideo), { wrapper: wrapper(store) });

        expect(watchVideo).not.toHaveBeenCalled();
    });

    it('does nothing when id is undefined', () => {
        hasViewedSpy.mockReturnValue(false);
        const store = makeStore();
        const watchVideo = vi.fn();

        renderHook(() => useViewTracking(undefined, true, watchVideo), { wrapper: wrapper(store) });

        expect(watchVideo).not.toHaveBeenCalled();
    });
});
