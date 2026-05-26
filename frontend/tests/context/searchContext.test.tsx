// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { SearchProvider } from '@context/searchContext';
import { useSearch } from '@context/search';

function ChildWithFocus({ inputEl }: { inputEl: HTMLInputElement | null }) {
    const { registerSearchInput, focusSearch } = useSearch();
    React.useEffect(() => {
        registerSearchInput(inputEl);
    }, [inputEl, registerSearchInput]);
    return <button type="button" onClick={focusSearch}>focus</button>;
}

describe('SearchProvider', () => {
    it('renders children and exposes context', () => {
        const { getByText } = render(
            <SearchProvider>
                <ChildWithFocus inputEl={null} />
            </SearchProvider>,
        );

        expect(getByText('focus')).toBeTruthy();
    });

    it('focusSearch calls focus() and select() on the registered input', () => {
        const input = document.createElement('input');
        input.focus = vi.fn();
        input.select = vi.fn();

        const { getByText } = render(
            <SearchProvider>
                <ChildWithFocus inputEl={input} />
            </SearchProvider>,
        );

        act(() => {
            getByText('focus').click();
        });

        expect(input.focus).toHaveBeenCalled();
        expect(input.select).toHaveBeenCalled();
    });

    it('focusSearch is a no-op when no input is registered', () => {
        const { getByText } = render(
            <SearchProvider>
                <ChildWithFocus inputEl={null} />
            </SearchProvider>,
        );

        expect(() => {
            act(() => {
                getByText('focus').click();
            });
        }).not.toThrow();
    });
});
