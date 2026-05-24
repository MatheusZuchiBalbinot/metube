import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS, THEME_MODES, THEME_COLORS, type ThemeMode, type ThemeColor } from '@utils';

interface ThemeState {
    mode: ThemeMode
    color: ThemeColor
}

function getInitialThemeState(): ThemeState {
    const rawMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE) ?? 'dark';
    const rawColor = localStorage.getItem(STORAGE_KEYS.THEME_COLOR) ?? 'violet';
    const mode = (THEME_MODES as readonly string[]).includes(rawMode) ? rawMode as ThemeMode : 'dark';
    const color = (THEME_COLORS as readonly string[]).includes(rawColor) ? rawColor as ThemeColor : 'violet';
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
