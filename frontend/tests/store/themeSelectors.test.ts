// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { themeActions } from '@store/themeSlice';
import { selectThemeMode, selectThemeColor, selectTheme } from '@store/themeSelectors';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

describe('themeSelectors', () => {
    it('reflects the mode and color after they change', () => {
        const store = makeStore();

        store.dispatch(themeActions.setMode('light'));
        store.dispatch(themeActions.setColor('blue'));

        expect(selectThemeMode(store.getState())).toBe('light');
        expect(selectThemeColor(store.getState())).toBe('blue');
    });

    it('selectTheme returns the whole theme slice', () => {
        const store = makeStore();
        expect(selectTheme(store.getState())).toBe(store.getState().theme);
    });
});
