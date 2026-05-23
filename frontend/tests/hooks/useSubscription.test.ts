// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { useSubscription } from '@hooks/useSubscription';
import subscriptionSlice from '@store/subscriptionSlice';
import type { ChannelId } from '@models/channel';

function makeStore(subscribedChannelIds: ChannelId[] = []) {
    return configureStore({
        reducer: { subscription: subscriptionSlice.reducer },
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
    it('starts with provided subscribedChannelIds', () => {
        const store = makeStore([ch('chan-1')]);
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });
        expect(result.current.subscribedChannelIds).toContain(ch('chan-1'));
    });

    it('toggleSubscription adds a channel when not subscribed', () => {
        const store = makeStore();
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });

        act(() => {
            result.current.toggleSubscription('chan-new');
        });

        expect(result.current.subscribedChannelIds).toContain('chan-new');
    });

    it('toggleSubscription removes a channel when already subscribed', () => {
        const store = makeStore([ch('chan-existing')]);
        const { result } = renderHook(() => useSubscription(), { wrapper: wrapper(store) });

        act(() => {
            result.current.toggleSubscription('chan-existing');
        });

        expect(result.current.subscribedChannelIds).not.toContain('chan-existing');
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
