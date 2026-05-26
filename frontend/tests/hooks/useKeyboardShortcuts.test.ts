// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        useNavigate: () => mockNavigate,
    };
});

const mockNavigate = vi.fn();

function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, null, children);
}

function defaultOptions() {
    return {
        onOpenUpload: vi.fn(),
        onOpenShortcuts: vi.fn(),
        onFocusSearch: vi.fn(),
    };
}

function pressKey(key: string, options: KeyboardEventInit = {}) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }));
}

describe('useKeyboardShortcuts', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockNavigate.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('pressing "u" calls onOpenUpload', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });
        pressKey('u');
        expect(opts.onOpenUpload).toHaveBeenCalledTimes(1);
    });

    it('pressing "/" calls onFocusSearch', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });
        pressKey('/');
        expect(opts.onFocusSearch).toHaveBeenCalledTimes(1);
    });

    it('pressing "f" calls onFocusSearch', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });
        pressKey('f');
        expect(opts.onFocusSearch).toHaveBeenCalledTimes(1);
    });

    it('pressing "?" calls onOpenShortcuts', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });
        pressKey('?');
        expect(opts.onOpenShortcuts).toHaveBeenCalledTimes(1);
    });

    it('chord "g" then "h" navigates to history', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });

        pressKey('g');
        pressKey('h');

        expect(mockNavigate).toHaveBeenCalledWith('/history');
    });

    it('chord "g" then "p" navigates to profile', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });

        pressKey('g');
        pressKey('p');

        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('chord "g" then "s" navigates to search', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });

        pressKey('g');
        pressKey('s');

        expect(mockNavigate).toHaveBeenCalledWith('/search');
    });

    it('chord times out after 800ms and does not fire', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });

        pressKey('g');

        vi.advanceTimersByTime(800);

        pressKey('h');

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not trigger shortcuts when typing in an input', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });

        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', bubbles: true }));

        expect(opts.onOpenUpload).not.toHaveBeenCalled();
        document.body.removeChild(input);
    });

    it('does not trigger shortcuts when ctrl modifier is held', () => {
        const opts = defaultOptions();
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });
        pressKey('u', { ctrlKey: true });
        expect(opts.onOpenUpload).not.toHaveBeenCalled();
    });

    it('calls video page shortcuts when videoPageId is provided', () => {
        const onLike = vi.fn();
        const onSave = vi.fn();
        const opts = {
            ...defaultOptions(),
            videoPageId: 'vuid-123',
            onLike,
            onSave,
        };
        renderHook(() => useKeyboardShortcuts(opts), { wrapper });

        pressKey('l');
        pressKey('s');

        expect(onLike).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledTimes(1);
    });
});
