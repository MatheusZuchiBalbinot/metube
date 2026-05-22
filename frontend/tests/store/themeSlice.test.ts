// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import themeSlice, { themeActions } from '@store/themeSlice';
import type { ThemeMode, ThemeColor } from '@utils/themes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reducer = themeSlice.reducer;

function makeState(overrides: Partial<{ mode: ThemeMode; color: ThemeColor }> = {}) {
    return {
        mode: 'dark' as ThemeMode,
        color: 'violet' as ThemeColor,
        ...overrides,
    };
}

beforeEach(() => {
    localStorage.clear();
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('themeSlice — initial state', () => {
    it('defaults mode to dark when localStorage is empty', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.mode).toBe('dark');
    });

    it('defaults color to violet when localStorage is empty', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.color).toBe('violet');
    });

    it('reads mode from localStorage when valid', () => {
        localStorage.setItem('theme-mode', 'light');
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.mode).toBe('light');
    });

    it('reads color from localStorage when valid', () => {
        localStorage.setItem('theme-color', 'blue');
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.color).toBe('blue');
    });

    it('falls back to dark when localStorage mode is invalid', () => {
        localStorage.setItem('theme-mode', 'rainbow');
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.mode).toBe('dark');
    });

    it('falls back to violet when localStorage color is invalid', () => {
        localStorage.setItem('theme-color', 'neon-pink');
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.color).toBe('violet');
    });
});

// ─── setMode ──────────────────────────────────────────────────────────────────

describe('themeSlice — setMode', () => {
    it('sets mode to light', () => {
        const state = makeState({ mode: 'dark' });
        const next = reducer(state, themeActions.setMode('light'));
        expect(next.mode).toBe('light');
    });

    it('sets mode to dark', () => {
        const state = makeState({ mode: 'light' });
        const next = reducer(state, themeActions.setMode('dark'));
        expect(next.mode).toBe('dark');
    });

    it('does not change the color when setting mode', () => {
        const state = makeState({ mode: 'dark', color: 'green' });
        const next = reducer(state, themeActions.setMode('light'));
        expect(next.color).toBe('green');
    });
});

// ─── setColor ─────────────────────────────────────────────────────────────────

describe('themeSlice — setColor', () => {
    it('sets color to blue', () => {
        const state = makeState({ color: 'violet' });
        const next = reducer(state, themeActions.setColor('blue'));
        expect(next.color).toBe('blue');
    });

    it('sets color to green', () => {
        const state = makeState({ color: 'violet' });
        const next = reducer(state, themeActions.setColor('green'));
        expect(next.color).toBe('green');
    });

    it('sets color to rose', () => {
        const state = makeState({ color: 'violet' });
        const next = reducer(state, themeActions.setColor('rose'));
        expect(next.color).toBe('rose');
    });

    it('sets color to amber', () => {
        const state = makeState({ color: 'violet' });
        const next = reducer(state, themeActions.setColor('amber'));
        expect(next.color).toBe('amber');
    });

    it('sets color back to violet', () => {
        const state = makeState({ color: 'blue' });
        const next = reducer(state, themeActions.setColor('violet'));
        expect(next.color).toBe('violet');
    });

    it('does not change the mode when setting color', () => {
        const state = makeState({ mode: 'light', color: 'violet' });
        const next = reducer(state, themeActions.setColor('rose'));
        expect(next.mode).toBe('light');
    });
});

// ─── combined transitions ─────────────────────────────────────────────────────

describe('themeSlice — combined transitions', () => {
    it('applies mode and color changes independently', () => {
        const state = makeState({ mode: 'dark', color: 'violet' });
        const afterMode = reducer(state, themeActions.setMode('light'));
        const afterColor = reducer(afterMode, themeActions.setColor('blue'));
        expect(afterColor.mode).toBe('light');
        expect(afterColor.color).toBe('blue');
    });
});
