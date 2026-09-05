// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import searchSlice, { searchActions } from '@store/searchSlice';


const reducer = searchSlice.reducer;

function makeState(recentSearches: string[] = []) {
    return { recentSearches };
}

beforeEach(() => {
    localStorage.clear();
});

describe('searchSlice — initial state', () => {
    it('has an empty recentSearches array when localStorage is empty', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.recentSearches).toEqual([]);
    });

    it('loads recentSearches from localStorage if present', () => {
        localStorage.setItem('metube:recent-searches', JSON.stringify(['react', 'typescript']));
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.recentSearches).toEqual(['react', 'typescript']);
    });

    it('returns empty array when localStorage value is malformed JSON', () => {
        localStorage.setItem('metube:recent-searches', 'not-json{');
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.recentSearches).toEqual([]);
    });
});

describe('searchSlice — addRecentSearch', () => {
    it('adds a new search term to the front', () => {
        const state = makeState(['old']);
        const next = reducer(state, searchActions.addRecentSearch('new term'));
        expect(next.recentSearches[0]).toBe('new term');
    });

    it('pushes existing terms down by one position', () => {
        const state = makeState(['second']);
        const next = reducer(state, searchActions.addRecentSearch('first'));
        expect(next.recentSearches).toEqual(['first', 'second']);
    });

    it('deduplicates by moving existing term to front', () => {
        const state = makeState(['react', 'typescript', 'redux']);
        const next = reducer(state, searchActions.addRecentSearch('typescript'));
        expect(next.recentSearches[0]).toBe('typescript');
        expect(next.recentSearches.filter(s => s === 'typescript')).toHaveLength(1);
    });

    it('deduplicates case-insensitively', () => {
        const state = makeState(['React']);
        const next = reducer(state, searchActions.addRecentSearch('react'));
        expect(next.recentSearches).toHaveLength(1);
        expect(next.recentSearches[0]).toBe('react');
    });

    it('deduplicates mixed-case preserving the new term casing', () => {
        const state = makeState(['REACT']);
        const next = reducer(state, searchActions.addRecentSearch('React'));
        expect(next.recentSearches[0]).toBe('React');
    });

    it('trims leading and trailing whitespace before adding', () => {
        const state = makeState([]);
        const next = reducer(state, searchActions.addRecentSearch('  hello  '));
        expect(next.recentSearches[0]).toBe('hello');
    });

    it('ignores empty string after trimming', () => {
        const state = makeState(['existing']);
        const next = reducer(state, searchActions.addRecentSearch('   '));
        expect(next.recentSearches).toEqual(['existing']);
    });

    it('ignores empty string', () => {
        const state = makeState([]);
        const next = reducer(state, searchActions.addRecentSearch(''));
        expect(next.recentSearches).toEqual([]);
    });

    it('caps the list at 5 items', () => {
        const state = makeState(['a', 'b', 'c', 'd', 'e']);
        const next = reducer(state, searchActions.addRecentSearch('f'));
        expect(next.recentSearches).toHaveLength(5);
        expect(next.recentSearches[0]).toBe('f');
    });

    it('drops the oldest item when exceeding max of 5', () => {
        const state = makeState(['b', 'c', 'd', 'e', 'oldest']);
        const next = reducer(state, searchActions.addRecentSearch('newest'));
        expect(next.recentSearches).not.toContain('oldest');
    });

    it('keeps exactly 5 items when adding to a full list of 5', () => {
        const state = makeState(['1', '2', '3', '4', '5']);
        const next = reducer(state, searchActions.addRecentSearch('6'));
        expect(next.recentSearches).toHaveLength(5);
    });
});

describe('searchSlice — removeRecentSearch', () => {
    it('removes the matching search term', () => {
        const state = makeState(['react', 'typescript', 'redux']);
        const next = reducer(state, searchActions.removeRecentSearch('typescript'));
        expect(next.recentSearches).toEqual(['react', 'redux']);
    });

    it('leaves the list unchanged when term is not found', () => {
        const state = makeState(['react', 'typescript']);
        const next = reducer(state, searchActions.removeRecentSearch('nonexistent'));
        expect(next.recentSearches).toEqual(['react', 'typescript']);
    });

    it('removes only the exact match (case-sensitive)', () => {
        const state = makeState(['React', 'react']);
        const next = reducer(state, searchActions.removeRecentSearch('React'));
        expect(next.recentSearches).toEqual(['react']);
    });

    it('results in an empty array when removing the only item', () => {
        const state = makeState(['only']);
        const next = reducer(state, searchActions.removeRecentSearch('only'));
        expect(next.recentSearches).toEqual([]);
    });
});

describe('searchSlice — clearRecentSearches', () => {
    it('empties the recentSearches array', () => {
        const state = makeState(['a', 'b', 'c']);
        const next = reducer(state, searchActions.clearRecentSearches());
        expect(next.recentSearches).toEqual([]);
    });

    it('is a no-op when already empty', () => {
        const state = makeState([]);
        const next = reducer(state, searchActions.clearRecentSearches());
        expect(next.recentSearches).toEqual([]);
    });
});
