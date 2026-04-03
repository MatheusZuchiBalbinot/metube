import { useRef, useCallback, type ReactNode } from 'react';
import { SearchContext } from './search';

export function SearchProvider({ children }: { children: ReactNode }) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const registerSearchInput = useCallback((el: HTMLInputElement | null) => {
        inputRef.current = el;
    }, []);

    const focusSearch = useCallback(() => {
        const input = inputRef.current;
        if (!input) {
            return;
        }
        input.focus();
        input.select();
    }, []);

    return (
        <SearchContext value={{ registerSearchInput, focusSearch }}>
            {children}
        </SearchContext>
    );
}
