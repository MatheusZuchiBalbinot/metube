import type { RootState } from './types';

export const selectRecentSearches = (state: RootState) => state.search.recentSearches;
