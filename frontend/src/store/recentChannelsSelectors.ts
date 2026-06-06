import type { RootState } from './types';

export const selectRecentChannels = (state: RootState) => state.recentChannels.channels;
