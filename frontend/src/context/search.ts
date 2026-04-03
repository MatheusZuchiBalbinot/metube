import { createContext, useContext } from 'react';

export interface SearchContextValue {
    /** Registers the search input ref from AppHeader. */
    registerSearchInput: (el: HTMLInputElement | null) => void
    /** Focuses and selects the search input. Called from layout keyboard shortcut. */
    focusSearch: () => void
}

export const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within SearchProvider');
    }
    return context;
}
