// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { searchActions } from '@store/searchSlice';
import { selectRecentSearches } from '@store/searchSelectors';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

describe('searchSelectors', () => {
    it('selectRecentSearches starts empty', () => {
        const store = makeStore();
        expect(selectRecentSearches(store.getState())).toEqual([]);
    });

    it('selectRecentSearches reflects recorded searches', () => {
        const store = makeStore();
        store.dispatch(searchActions.addRecentSearch('react hooks'));

        expect(selectRecentSearches(store.getState())).toEqual(['react hooks']);
    });
});
