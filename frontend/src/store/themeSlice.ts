import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@utils/storageKeys';
import type { ThemeMode, ThemeColor } from '@utils/themes';

interface ThemeState {
    mode: ThemeMode
    color: ThemeColor
}

function getInitialThemeState(): ThemeState {
    const mode = (localStorage.getItem(STORAGE_KEYS.THEME_MODE) as ThemeMode) ?? 'dark';
    const color = (localStorage.getItem(STORAGE_KEYS.THEME_COLOR) as ThemeColor) ?? 'violet';
    return { mode, color };
}

const themeSlice = createSlice({
    name: 'theme',
    initialState: getInitialThemeState,
    reducers: {
        setMode(state, action: PayloadAction<ThemeMode>) {
            state.mode = action.payload;
        },
        setColor(state, action: PayloadAction<ThemeColor>) {
            state.color = action.payload;
        },
    },
});

export const themeActions = themeSlice.actions;
export default themeSlice;
