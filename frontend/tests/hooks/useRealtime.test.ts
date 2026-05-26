// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { useRealtime } from '@hooks/useRealtime';
import authSlice from '@store/authSlice';
import videoSlice from '@store/videoSlice';
import toastSlice from '@store/toastSlice';
import notificationsSlice from '@store/notificationsSlice';
import { makeUser } from '../helpers/factories';

const echoMocks = vi.hoisted(() => {
    const channel = {
        notification: vi.fn(),
        listen: vi.fn(),
    };
    const echo = {
        private: vi.fn().mockReturnValue(channel),
        leave: vi.fn(),
    };
    return { channel, echo };
});

vi.mock('@lib/echo', () => ({
    getEcho: vi.fn().mockResolvedValue(echoMocks.echo),
    destroyEcho: vi.fn(),
}));

vi.mock('@api/notifications', () => ({
    notifications: {
        unreadCount: vi.fn().mockResolvedValue(0),
    },
}));

vi.mock('@api/videos', () => ({
    video: { get: vi.fn() },
    toVuid: (id: string) => id,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@utils/notificationSound', () => ({
    playNotificationSound: vi.fn().mockResolvedValue(undefined),
}));

import { getEcho, destroyEcho } from '@lib/echo';
import { notifications as notificationsApi } from '@api/notifications';

function makeStore(user: ReturnType<typeof makeUser> | null = null) {
    const resolvedUser = user ?? makeUser({ id: 'u-1' } as Parameters<typeof makeUser>[0]);
    return configureStore({
        reducer: {
            auth: authSlice.reducer,
            video: videoSlice.reducer,
            toast: toastSlice.reducer,
            notifications: notificationsSlice.reducer,
        },
        preloadedState: {
            auth: { user: resolvedUser, loading: false, sessionError: null },
        },
    });
}

function makeNullUserStore() {
    return configureStore({
        reducer: {
            auth: authSlice.reducer,
            video: videoSlice.reducer,
            toast: toastSlice.reducer,
            notifications: notificationsSlice.reducer,
        },
        preloadedState: {
            auth: { user: null, loading: false, sessionError: null },
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

describe('useRealtime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        echoMocks.echo.private.mockReturnValue(echoMocks.channel);
        vi.mocked(getEcho).mockResolvedValue(echoMocks.echo as unknown as Awaited<ReturnType<typeof getEcho>>);
        vi.mocked(notificationsApi.unreadCount).mockResolvedValue(0);
    });

    it('fetches initial unread count when user is logged in', async () => {
        vi.mocked(notificationsApi.unreadCount).mockResolvedValue(7);
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(notificationsApi.unreadCount).toHaveBeenCalled();
        });

        expect(store.getState().notifications.unreadCount).toBe(7);
    });

    it('connects to the private Echo channel for the logged-in user', async () => {
        const user = makeUser({ id: 'u-echo', uuid: 'uuid-echo' } as Parameters<typeof makeUser>[0]);
        const store = makeStore(user);
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.echo.private).toHaveBeenCalled();
        });

        expect(echoMocks.echo.private).toHaveBeenCalledWith(`users.${user.uuid}`);
        expect(echoMocks.channel.notification).toHaveBeenCalled();
        expect(echoMocks.channel.listen).toHaveBeenCalledWith('.VideoStatusUpdated', expect.any(Function));
    });

    it('does not connect when user is null', async () => {
        const store = makeNullUserStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store as unknown as ReturnType<typeof makeStore>) });

        // Give effects a tick to potentially fire
        await new Promise(res => setTimeout(res, 10));

        expect(notificationsApi.unreadCount).not.toHaveBeenCalled();
        expect(echoMocks.echo.private).not.toHaveBeenCalled();
    });

    it('calls destroyEcho on unmount when user is logged in', async () => {
        const store = makeStore();
        const { unmount } = renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(getEcho).toHaveBeenCalled();
        });

        unmount();

        expect(destroyEcho).toHaveBeenCalled();
    });

    it('registers .TranscriptionStatusUpdated and .AiSuggestionReady listeners', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.TranscriptionStatusUpdated', expect.any(Function));
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.AiSuggestionReady', expect.any(Function));
        });
    });

    it('dispatches a toast when a known notification arrives without dedicated broadcast handler', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({
            id: 'n-1',
            type: 'App\\Notifications\\VideoLikedNotification',
            liker_name: 'Alice',
        });

        const state = store.getState();
        expect(state.notifications.items.length).toBe(1);
        expect(state.toast.toasts.length).toBe(1);
    });

    it('ignores notification payloads with unknown type', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({
            id: 'n-2',
            type: 'App\\Notifications\\UnknownNotification',
        });

        expect(store.getState().notifications.items.length).toBe(0);
    });

    it('does not emit a toast for broadcast-handled notification types', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({
            id: 'n-3',
            type: 'App\\Notifications\\VideoTranscribedNotification',
        });

        // Notification stored, but no toast (the .TranscriptionStatusUpdated listener handles it).
        expect(store.getState().notifications.items.length).toBe(1);
        expect(store.getState().toast.toasts.length).toBe(0);
    });

    it('TranscriptionStatusUpdated listener emits success toast on completed', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.TranscriptionStatusUpdated', expect.any(Function));
        });

        const call = echoMocks.channel.listen.mock.calls.find(c => c[0] === '.TranscriptionStatusUpdated');
        const handler = call?.[1] as (d: { vuid: string; status: string }) => void;
        handler({ vuid: 'v-1', status: 'completed' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('TranscriptionStatusUpdated listener emits error toast on failed', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.TranscriptionStatusUpdated', expect.any(Function));
        });

        const call = echoMocks.channel.listen.mock.calls.find(c => c[0] === '.TranscriptionStatusUpdated');
        const handler = call?.[1] as (d: { vuid: string; status: string }) => void;
        handler({ vuid: 'v-1', status: 'failed' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('TranscriptionStatusUpdated listener emits info toast on processing', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.TranscriptionStatusUpdated', expect.any(Function));
        });

        const call = echoMocks.channel.listen.mock.calls.find(c => c[0] === '.TranscriptionStatusUpdated');
        const handler = call?.[1] as (d: { vuid: string; status: string }) => void;
        handler({ vuid: 'v-1', status: 'processing' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('AiSuggestionReady listener emits a success toast', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.AiSuggestionReady', expect.any(Function));
        });

        const call = echoMocks.channel.listen.mock.calls.find(c => c[0] === '.AiSuggestionReady');
        const handler = call?.[1] as (p: { vuid: string; title: string }) => void;
        handler({ vuid: 'v-1', title: 'New title' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('notification — COMMENT_REPLIED shows toast', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({ id: 'n-cr', type: 'App\\Notifications\\CommentRepliedNotification', replier_name: 'Alice' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('notification — COMMENT_LIKED shows toast', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({ id: 'n-cl', type: 'App\\Notifications\\CommentLikedNotification', liker_name: 'Bob' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('notification — NEW_SUBSCRIBER shows toast', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({ id: 'n-ns', type: 'App\\Notifications\\NewSubscriberNotification', subscriber_name: 'Carol' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('notification — VIDEO_FROM_SUBSCRIPTION shows toast', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({ id: 'n-vfs', type: 'App\\Notifications\\VideoFromSubscriptionNotification', channel_name: 'TechCh' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('notification — VIDEO_PROCESSED (success) shows toast', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({ id: 'n-vp', type: 'App\\Notifications\\VideoProcessedNotification', failed: false });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('notification — VIDEO_PROCESSED (failed) shows toast', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.notification).toHaveBeenCalled();
        });

        const handler = echoMocks.channel.notification.mock.calls[0][0] as (p: Record<string, unknown>) => void;
        handler({ id: 'n-vpf', type: 'App\\Notifications\\VideoProcessedNotification', failed: true });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('VideoStatusUpdated listener with PROCESSING status emits info toast', async () => {
        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.VideoStatusUpdated', expect.any(Function));
        });

        const call = echoMocks.channel.listen.mock.calls.find(c => c[0] === '.VideoStatusUpdated');
        const handler = call?.[1] as (d: { vuid: string; status: string }) => void;
        handler({ vuid: 'v-1', status: 'processing' });

        expect(store.getState().toast.toasts.length).toBe(1);
    });

    it('VideoStatusUpdated listener with terminal status fetches full video on ok', async () => {
        const { video: videoApi } = await import('@api/videos');
        const fullVideo = { id: 'v-1', title: 'Done', status: 'published' } as never;
        vi.mocked(videoApi.get).mockResolvedValue({ ok: true, data: fullVideo });

        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.VideoStatusUpdated', expect.any(Function));
        });

        const call = echoMocks.channel.listen.mock.calls.find(c => c[0] === '.VideoStatusUpdated');
        const handler = call?.[1] as (d: { vuid: string; status: string }) => void;
        handler({ vuid: 'v-1', status: 'published' });

        await waitFor(() => {
            expect(videoApi.get).toHaveBeenCalledWith('v-1');
        });
    });

    it('VideoStatusUpdated listener with terminal status ignores failed video.get', async () => {
        const { video: videoApi } = await import('@api/videos');
        vi.mocked(videoApi.get).mockResolvedValue({ ok: false, error: 'not found' });

        const store = makeStore();
        renderHook(() => useRealtime(), { wrapper: makeWrapper(store) });

        await waitFor(() => {
            expect(echoMocks.channel.listen).toHaveBeenCalledWith('.VideoStatusUpdated', expect.any(Function));
        });

        const call = echoMocks.channel.listen.mock.calls.find(c => c[0] === '.VideoStatusUpdated');
        const handler = call?.[1] as (d: { vuid: string; status: string }) => void;
        handler({ vuid: 'v-2', status: 'failed' });

        await waitFor(() => {
            expect(videoApi.get).toHaveBeenCalled();
        });

        expect(store.getState().toast.toasts.length).toBe(0);
    });
});
