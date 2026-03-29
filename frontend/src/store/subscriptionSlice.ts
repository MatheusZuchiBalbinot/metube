import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@utils/storageKeys';
import { loadFromStorage, isArray } from '@utils/loadFromStorage';
import type { ChannelId } from '@models/channel';
import type { RootState } from './index';

interface SubscriptionState {
    subscribedChannelIds: ChannelId[]
}

const SEED_SUBSCRIPTIONS = ['ch_1', 'ch_3', 'ch_5'] as ChannelId[];

const subscriptionSlice = createSlice({
    name: 'subscription',
    initialState: (): SubscriptionState => ({
        subscribedChannelIds: loadFromStorage<ChannelId[]>(STORAGE_KEYS.SUBSCRIPTIONS, SEED_SUBSCRIPTIONS, isArray),
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

export const selectSubscribedSet = createSelector(
    (state: RootState) => state.subscription.subscribedChannelIds,
    (ids) => new Set(ids),
);

export const subscriptionActions = subscriptionSlice.actions;
export default subscriptionSlice;
