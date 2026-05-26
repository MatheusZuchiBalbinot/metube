// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useTheme } from '@hooks/useTheme';
import themeSlice from '@store/themeSlice';

function makeStore() {
    return configureStore({ reducer: { theme: themeSlice.reducer } });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

describe('useTheme', () => {
    it('returns the current mode and color from the store', () => {
        const store = makeStore();
        const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper(store) });

        expect(result.current.mode).toBeDefined();
        expect(result.current.color).toBeDefined();
    });

    it('setMode dispatches and updates the store', () => {
        const store = makeStore();
        const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.setMode('light');
        });

        expect(store.getState().theme.mode).toBe('light');
        expect(result.current.mode).toBe('light');
    });

    it('setColor dispatches and updates the store', () => {
        const store = makeStore();
        const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.setColor('blue');
        });

        expect(store.getState().theme.color).toBe('blue');
        expect(result.current.color).toBe('blue');
    });
});
