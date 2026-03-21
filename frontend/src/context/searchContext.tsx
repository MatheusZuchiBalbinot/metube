import { createContext, useRef, useCallback, useContext } from 'react';

interface SearchContextValue {
    /** Registers the search input ref from AppHeader. */
    registerSearchInput: (el: HTMLInputElement | null) => void
    /** Focuses and selects the search input. Called from layout keyboard shortcut. */
    focusSearch: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const registerSearchInput = useCallback((el: HTMLInputElement | null) => {
        inputRef.current = el;
    }, []);

    const focusSearch = useCallback(() => {
        const input = inputRef.current;
        if (!input) { return; }
        input.focus();
        input.select();
    }, []);

    return (
        <SearchContext value={{ registerSearchInput, focusSearch }}>
            {children}
        </SearchContext>
    );
}

export function useSearch(): SearchContextValue {
    const ctx = useContext(SearchContext);
    if (!ctx) { throw new Error('useSearch must be used inside SearchProvider'); }
    return ctx;
}
