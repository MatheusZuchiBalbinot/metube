import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@utils';

// Maximum number of recent search terms to persist.
// Keeps the dropdown concise and avoids unbounded localStorage growth.
const MAX_RECENT_SEARCHES = 5;

interface SearchState {
    recentSearches: string[]
}

function loadRecentSearches(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
        const isStored = raw !== null;
        if (!isStored) {
            return [];
        }

        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

const searchSlice = createSlice({
    name: 'search',
    initialState: (): SearchState => ({
        recentSearches: loadRecentSearches(),
    }),
    reducers: {
        addRecentSearch(state, action: PayloadAction<string>) {
            const trimmed = action.payload.trim();
            const isEmpty = trimmed.length === 0;
            if (isEmpty) {
                return;
            }

            const deduped = state.recentSearches.filter(
                s => s.toLowerCase() !== trimmed.toLowerCase(),
            );
            state.recentSearches = [trimmed, ...deduped].slice(0, MAX_RECENT_SEARCHES);
        },
        removeRecentSearch(state, action: PayloadAction<string>) {
            state.recentSearches = state.recentSearches.filter(s => s !== action.payload);
        },
        clearRecentSearches(state) {
            state.recentSearches = [];
        },
    },
});

export const searchActions = searchSlice.actions;
export default searchSlice;
