import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './types';

export const selectSubscribedChannelIds = (state: RootState) => state.subscription.subscribedChannelIds;

export const selectSubscribedSet = createSelector(
    (state: RootState) => state.subscription.subscribedChannelIds,
    (ids) => new Set(ids),
);
