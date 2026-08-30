// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useVideoShare } from '@pages/video/hooks/useVideoShare';
import toastSlice from '@store/toastSlice';
import { selectToasts } from '@store/toastSelectors';

function makeStore() {
    return configureStore({ reducer: { toast: toastSlice.reducer } });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

describe('useVideoShare', () => {
    beforeEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
            configurable: true,
        });
        window.history.replaceState(null, '', 'http://localhost:3000/watch?v=abc');
    });

    it('starts with the share dropdown closed and not copied', () => {
        const store = makeStore();
        const { result } = renderHook(() => useVideoShare(() => 0), { wrapper: wrapper(store) });

        expect(result.current.isShareDropdownOpen).toBe(false);
        expect(result.current.isCopied).toBe(false);
    });

    it('handleShareCopyLink copies the URL without the query string and toasts', () => {
        const store = makeStore();
        const { result } = renderHook(() => useVideoShare(() => 0), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleShareCopyLink();
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/watch');
        expect(result.current.isCopied).toBe(true);
        expect(selectToasts(store.getState())).toHaveLength(1);
    });

    it('handleShareCopyLink closes the share dropdown', () => {
        const store = makeStore();
        const { result } = renderHook(() => useVideoShare(() => 0), { wrapper: wrapper(store) });

        act(() => {
            result.current.setIsShareDropdownOpen(true);
        });
        act(() => {
            result.current.handleShareCopyLink();
        });

        expect(result.current.isShareDropdownOpen).toBe(false);
    });

    it('handleShareCopyAtTime appends the floored current time as a query param', () => {
        const store = makeStore();
        const { result } = renderHook(() => useVideoShare(() => 125.9), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleShareCopyAtTime();
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/watch?t=125s');
    });
});
