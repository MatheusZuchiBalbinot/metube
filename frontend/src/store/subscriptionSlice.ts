import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import type { ChannelId } from '@models';
import type { RootState } from './types';
import { STORAGE_KEYS, loadFromStorage, isArray } from '@utils';

interface SubscriptionState {
    subscribedChannelIds: ChannelId[]
}

const subscriptionSlice = createSlice({
    name: 'subscription',
    initialState: (): SubscriptionState => ({
        subscribedChannelIds: loadFromStorage<ChannelId[]>(STORAGE_KEYS.SUBSCRIPTIONS, [], isArray),
    }),
    reducers: {
        toggleSubscription(state, action: PayloadAction<ChannelId>) {
            const channelId = action.payload;
            const index = state.subscribedChannelIds.indexOf(channelId);
            const isAlreadySubscribed = index !== -1;
            if (isAlreadySubscribed) {
                state.subscribedChannelIds.splice(index, 1);
            } else {
                state.subscribedChannelIds.push(channelId);
            }
        },

        // Cross-tab sync — name starts with 'subscription/xTab', excluded from persist listener
        xTabSetSubscriptions(state, action: PayloadAction<ChannelId[]>) {
            state.subscribedChannelIds = action.payload;
        },
    },
});

export const subscriptionActions = subscriptionSlice.actions;
export default subscriptionSlice;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectSubscribedSet = createSelector(
    (state: RootState) => state.subscription.subscribedChannelIds,
    (ids) => new Set(ids),
);
