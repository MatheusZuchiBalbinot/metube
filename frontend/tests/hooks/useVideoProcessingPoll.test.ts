// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { useVideoProcessingPoll } from '@hooks/useVideoProcessingPoll';
import videoSlice from '@store/videoSlice';
import toastSlice from '@store/toastSlice';
import { VideoStatus } from '@models/video';
import type { Vuid } from '@api';
import { makeVideo, vid } from '../helpers/factories';

vi.mock('@api/videos', () => ({
    video: {
        get: vi.fn(),
    },
    toVuid: (id: string) => id,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

import { video as videoApi } from '@api/videos';

function makeStore() {
    return configureStore({
        reducer: {
            video: videoSlice.reducer,
            toast: toastSlice.reducer,
        },
    });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
            Provider,
            { store },
            React.createElement(MemoryRouter, null, children),
        );
    };
}

describe('useVideoProcessingPoll', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts polling after initial delay when vuid is provided', async () => {
        const processing = makeVideo({ id: vid('v-p1'), status: VideoStatus.PROCESSING });
        vi.mocked(videoApi.get).mockResolvedValue({ ok: true, data: processing });

        const store = makeStore();
        renderHook(() => useVideoProcessingPoll('v-p1' as unknown as Vuid), {
            wrapper: makeWrapper(store),
        });

        expect(videoApi.get).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        expect(videoApi.get).toHaveBeenCalledWith('v-p1');
    });

    it('stops polling when video transitions to published', async () => {
        const processing = makeVideo({ id: vid('v-p2'), status: VideoStatus.PROCESSING });
        const published = makeVideo({ id: vid('v-p2'), status: VideoStatus.PUBLISHED });
        vi.mocked(videoApi.get)
            .mockResolvedValueOnce({ ok: true, data: processing })
            .mockResolvedValueOnce({ ok: true, data: published });

        const store = makeStore();
        renderHook(() => useVideoProcessingPoll('v-p2' as unknown as Vuid), {
            wrapper: makeWrapper(store),
        });

        // First tick: returns processing
        await act(async () => {
            vi.advanceTimersByTime(3000);
        });
        // Second tick: returns published → polling stops
        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        const callCount = vi.mocked(videoApi.get).mock.calls.length;

        // Further advances should produce no additional calls
        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(vi.mocked(videoApi.get).mock.calls.length).toBe(callCount);
    });

    it('stops polling on API error', async () => {
        vi.mocked(videoApi.get).mockResolvedValue({ ok: false, error: 'Network error' });

        const store = makeStore();
        renderHook(() => useVideoProcessingPoll('v-err' as unknown as Vuid), {
            wrapper: makeWrapper(store),
        });

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        const callCount = vi.mocked(videoApi.get).mock.calls.length;

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });

        expect(vi.mocked(videoApi.get).mock.calls.length).toBe(callCount);
    });

    it('dispatches an error toast when the status check itself fails', async () => {
        vi.mocked(videoApi.get).mockResolvedValue({ ok: false, error: 'Network error' });

        const store = makeStore();
        renderHook(() => useVideoProcessingPoll('v-err2' as unknown as Vuid), {
            wrapper: makeWrapper(store),
        });

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        const toasts = store.getState().toast.toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0]).toMatchObject({ message: 'toast.video_status_check_failed', type: 'error' });
    });

    it('does nothing when vuids is null', async () => {
        const store = makeStore();
        renderHook(() => useVideoProcessingPoll(null), {
            wrapper: makeWrapper(store),
        });

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        expect(videoApi.get).not.toHaveBeenCalled();
    });

    it('handles an array of vuids and polls each', async () => {
        const p1 = makeVideo({ id: vid('v-a1'), status: VideoStatus.PROCESSING });
        const p2 = makeVideo({ id: vid('v-a2'), status: VideoStatus.PROCESSING });
        vi.mocked(videoApi.get)
            .mockResolvedValueOnce({ ok: true, data: p1 })
            .mockResolvedValueOnce({ ok: true, data: p2 });

        const store = makeStore();
        const vuids = ['v-a1', 'v-a2'] as unknown as Vuid[];
        renderHook(() => useVideoProcessingPoll(vuids), { wrapper: makeWrapper(store) });

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        expect(videoApi.get).toHaveBeenCalledWith('v-a1');
        expect(videoApi.get).toHaveBeenCalledWith('v-a2');
    });

    it('clears timers on unmount', async () => {
        const processing = makeVideo({ id: vid('v-um'), status: VideoStatus.PROCESSING });
        vi.mocked(videoApi.get).mockResolvedValue({ ok: true, data: processing });

        const store = makeStore();
        const { unmount } = renderHook(
            () => useVideoProcessingPoll('v-um' as unknown as Vuid),
            { wrapper: makeWrapper(store) },
        );

        unmount();

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(videoApi.get).not.toHaveBeenCalled();
    });
});
