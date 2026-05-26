// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { SearchContext, useSearch, type SearchContextValue } from '@context/search';

describe('useSearch', () => {
    it('throws when called outside a SearchProvider', () => {
        expect(() => renderHook(() => useSearch())).toThrow(/SearchProvider/);
    });

    it('returns the context value when inside a provider', () => {
        const value: SearchContextValue = {
            registerSearchInput: () => {},
            focusSearch: () => {},
        };

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
        );

        const { result } = renderHook(() => useSearch(), { wrapper });
        expect(result.current).toBe(value);
    });
});
