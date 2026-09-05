// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import subscriptionSlice from '@store/subscriptionSlice';
import { useSubscriptions } from '@hooks/useSubscriptions';
import { channel } from '@api';
import type { ChannelId, User } from '@models';

const ch = (s: string) => s as unknown as ChannelId;

function makeUser(uuid: string, name: string): User {
    return {
        id: 1 as unknown as User['id'],
        uuid,
        name,
        email: `${name}@example.com`,
        createdAt: '2026-01-01',
    };
}

function makeStore(subscribedChannelIds: ChannelId[], authenticated: boolean) {
    return configureStore({
        reducer: {
            subscription: subscriptionSlice.reducer,
            auth: (state = { user: authenticated ? makeUser('me', 'Me') : null }) => state,
        },
        preloadedState: { subscription: { subscribedChannelIds } },
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useSubscriptions', () => {
    it('does not fetch and returns no channels when unauthenticated', async () => {
        const spy = vi.spyOn(channel, 'subscriptions');
        const store = makeStore([ch('c1')], false);

        const { result } = renderHook(() => useSubscriptions(), { wrapper: wrapper(store) });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.channels).toHaveLength(0);
        expect(spy).not.toHaveBeenCalled();
    });

    it('returns the fetched subscribed channels when authenticated', async () => {
        vi.spyOn(channel, 'subscriptions').mockResolvedValue({
            ok: true,
            data: [makeUser('c1', 'Alpha'), makeUser('c2', 'Beta')],
        });
        const store = makeStore([ch('c1'), ch('c2')], true);

        const { result } = renderHook(() => useSubscriptions(), { wrapper: wrapper(store) });

        await waitFor(() => expect(result.current.channels).toHaveLength(2));
        expect(result.current.channels.map(c => c.name)).toEqual(['Alpha', 'Beta']);
    });

    it('trusts the server list even when it differs from the local subscribed set', async () => {
        // The server is the source of truth: a channel present in the local
        // set (persisted client-side) but missing from GET /users/me/subscriptions
        // — e.g. a different session, or storage that drifted — must not hide
        // channels the server actually returns.
        vi.spyOn(channel, 'subscriptions').mockResolvedValue({
            ok: true,
            data: [makeUser('c1', 'Alpha'), makeUser('c2', 'Beta')],
        });
        const store = makeStore([ch('c1')], true);

        const { result } = renderHook(() => useSubscriptions(), { wrapper: wrapper(store) });

        await waitFor(() => expect(result.current.channels).toHaveLength(2));
        expect(result.current.channels.map(c => c.uuid)).toEqual(['c1', 'c2']);
    });

    it('returns no channels when the request fails', async () => {
        vi.spyOn(channel, 'subscriptions').mockResolvedValue({ ok: false, error: 'boom' });
        const store = makeStore([ch('c1')], true);

        const { result } = renderHook(() => useSubscriptions(), { wrapper: wrapper(store) });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.channels).toHaveLength(0);
    });
});
