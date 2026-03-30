// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import subscriptionSlice, { subscriptionActions, selectSubscribedSet } from '@store/subscriptionSlice';
import type { ChannelId } from '@models/channel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reducer = subscriptionSlice.reducer;

function makeState(subscribedChannelIds: ChannelId[] = []) {
    return { subscribedChannelIds };
}

const ch1 = 'ch_1' as ChannelId;
const ch2 = 'ch_2' as ChannelId;
const ch3 = 'ch_3' as ChannelId;

beforeEach(() => {
    localStorage.clear();
});

// ─── toggleSubscription ───────────────────────────────────────────────────────

describe('subscriptionSlice — toggleSubscription', () => {
    it('adds channelId when not yet subscribed', () => {
        const state = makeState([]);
        const next = reducer(state, subscriptionActions.toggleSubscription(ch1));
        expect(next.subscribedChannelIds).toContain(ch1);
    });

    it('removes channelId when already subscribed', () => {
        const state = makeState([ch1]);
        const next = reducer(state, subscriptionActions.toggleSubscription(ch1));
        expect(next.subscribedChannelIds).not.toContain(ch1);
    });

    it('does not affect other subscribed channels', () => {
        const state = makeState([ch1, ch2, ch3]);
        const next = reducer(state, subscriptionActions.toggleSubscription(ch2));
        expect(next.subscribedChannelIds).toContain(ch1);
        expect(next.subscribedChannelIds).toContain(ch3);
        expect(next.subscribedChannelIds).not.toContain(ch2);
    });
});

// ─── xTabSetSubscriptions ─────────────────────────────────────────────────────

describe('subscriptionSlice — xTabSetSubscriptions', () => {
    it('replaces the entire subscribed channels list', () => {
        const state = makeState([ch1, ch2]);
        const next = reducer(state, subscriptionActions.xTabSetSubscriptions([ch3]));
        expect(next.subscribedChannelIds).toEqual([ch3]);
    });

    it('sets an empty list when given an empty array', () => {
        const state = makeState([ch1, ch2]);
        const next = reducer(state, subscriptionActions.xTabSetSubscriptions([]));
        expect(next.subscribedChannelIds).toEqual([]);
    });
});

// ─── selectSubscribedSet ──────────────────────────────────────────────────────

describe('selectSubscribedSet', () => {
    it('returns a Set wrapping the subscribed channel ids', () => {
        const state = { subscription: { subscribedChannelIds: [ch1, ch2] } };
        const result = selectSubscribedSet(state as Parameters<typeof selectSubscribedSet>[0]);
        expect(result.has(ch1)).toBe(true);
        expect(result.has(ch2)).toBe(true);
        expect(result.has(ch3)).toBe(false);
    });

    it('returns an empty Set when there are no subscriptions', () => {
        const state = { subscription: { subscribedChannelIds: [] } };
        expect(selectSubscribedSet(state as Parameters<typeof selectSubscribedSet>[0]).size).toBe(0);
    });
});
