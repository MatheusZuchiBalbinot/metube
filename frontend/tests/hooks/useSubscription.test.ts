// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { useSubscription } from '@hooks/useSubscription';
import subscriptionSlice from '@store/subscriptionSlice';
import toastSlice from '@store/toastSlice';
import type { ChannelId } from '@models/channel';

vi.mock('@api/channels', () => ({
    channel: {
        toggleSubscription: vi.fn(),
    },
    toUuid: (id: string) => id,
}));

import { channel } from '@api/channels';

function makeStore(subscribedChannelIds: ChannelId[] = []) {
    return configureStore({
        reducer: { subscription: subscriptionSlice.reducer, toast: toastSlice.reducer },
        preloadedState: { subscription: { subscribedChannelIds } },
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
            Provider,
            { store },
            React.createElement(MemoryRouter, null, children),
        );
    };
}

const ch = (s: string) => s as unknown as ChannelId;

describe('useSubscription', () => {
    beforeEach(() => {
        vi.mocked(channel.toggleSubscription).mockReset();
    });

    it('starts with provided subscribedChannelIds', () => {
        const store = makeStore([ch('chan-1')]);
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });
        expect(result.current.subscribedChannelIds).toContain(ch('chan-1'));
    });

    it('toggleSubscription optimistically adds a channel and persists it to the server', async () => {
        vi.mocked(channel.toggleSubscription).mockResolvedValue(true);
        const store = makeStore();
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });

        await act(async () => {
            await result.current.toggleSubscription(ch('chan-new'));
        });

        expect(result.current.subscribedChannelIds).toContain('chan-new');
        expect(channel.toggleSubscription).toHaveBeenCalledWith('chan-new');
        expect(store.getState().toast.toasts).toHaveLength(1);
    });

    it('toggleSubscription removes a channel when already subscribed', async () => {
        vi.mocked(channel.toggleSubscription).mockResolvedValue(true);
        const store = makeStore([ch('chan-existing')]);
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });

        await act(async () => {
            await result.current.toggleSubscription(ch('chan-existing'));
        });

        expect(result.current.subscribedChannelIds).not.toContain('chan-existing');
    });

    it('rolls back the optimistic update and shows a toast when the server call fails', async () => {
        vi.mocked(channel.toggleSubscription).mockResolvedValue(false);
        const store = makeStore();
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });

        await act(async () => {
            await result.current.toggleSubscription(ch('chan-new'));
        });

        expect(result.current.subscribedChannelIds).not.toContain('chan-new');
        expect(store.getState().toast.toasts).toHaveLength(1);
    });

    it('isSubscribed returns true for subscribed channel', () => {
        const store = makeStore([ch('chan-sub')]);
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });
        expect(result.current.isSubscribed('chan-sub')).toBe(true);
    });

    it('isSubscribed returns false for non-subscribed channel', () => {
        const store = makeStore();
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });
        expect(result.current.isSubscribed('chan-none')).toBe(false);
    });
});
