// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import videoSlice from '@store/videoSlice';
import notificationsSlice from '@store/notificationsSlice';
import { useNotificationBroadcast } from '@hooks/useNotificationBroadcast';

vi.mock('@api/videos', () => ({
    video: { get: vi.fn() },
    toVuid: (id: string) => id,
}));

import { video as videoApi } from '@api/videos';

function makeStore() {
    return configureStore({ reducer: { video: videoSlice.reducer, notifications: notificationsSlice.reducer } });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

function makeLocationRef(search = '') {
    return { current: { search } as Location };
}

describe('useNotificationBroadcast', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('persists a known notification and toasts it', () => {
        const store = makeStore();
        const notify = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(
            () => useNotificationBroadcast({ notify, tRef, locationRef: makeLocationRef() }),
            { wrapper: makeWrapper(store) },
        );

        result.current({ id: 'n-1', type: 'App\\Notifications\\VideoLikedNotification', liker_name: 'Alice' });

        expect(store.getState().notifications.items).toHaveLength(1);
        expect(notify).toHaveBeenCalledTimes(1);
    });

    it('ignores an unknown notification type', () => {
        const store = makeStore();
        const notify = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(
            () => useNotificationBroadcast({ notify, tRef, locationRef: makeLocationRef() }),
            { wrapper: makeWrapper(store) },
        );

        result.current({ id: 'n-1', type: 'App\\Notifications\\UnknownNotification' });

        expect(store.getState().notifications.items).toHaveLength(0);
        expect(notify).not.toHaveBeenCalled();
    });

    it('does not toast a type with a dedicated broadcast handler', () => {
        const store = makeStore();
        const notify = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(
            () => useNotificationBroadcast({ notify, tRef, locationRef: makeLocationRef() }),
            { wrapper: makeWrapper(store) },
        );

        result.current({ id: 'n-1', type: 'App\\Notifications\\VideoTranscribedNotification' });

        expect(store.getState().notifications.items).toHaveLength(1);
        expect(notify).not.toHaveBeenCalled();
    });

    it('refreshes an off-screen video on an AI summary ready notification', async () => {
        vi.mocked(videoApi.get).mockResolvedValue({ ok: true, data: { id: 'v-1', status: 'published' } as never });
        const store = makeStore();
        const notify = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(
            () => useNotificationBroadcast({ notify, tRef, locationRef: makeLocationRef('?v=v-2') }),
            { wrapper: makeWrapper(store) },
        );

        result.current({
            id: 'n-1',
            type: 'App\\Notifications\\VideoAiSummaryReadyNotification',
            vuid: 'v-1',
        });

        await waitFor(() => {
            expect(videoApi.get).toHaveBeenCalledWith('v-1');
        });
    });

    it('does not refresh the video currently being watched', () => {
        const store = makeStore();
        const notify = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(
            () => useNotificationBroadcast({ notify, tRef, locationRef: makeLocationRef('?v=v-1') }),
            { wrapper: makeWrapper(store) },
        );

        result.current({
            id: 'n-1',
            type: 'App\\Notifications\\VideoAiSummaryReadyNotification',
            vuid: 'v-1',
        });

        expect(videoApi.get).not.toHaveBeenCalled();
    });
});
