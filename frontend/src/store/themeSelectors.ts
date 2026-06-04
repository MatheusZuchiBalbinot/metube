import type { RootState } from './types';

export const selectThemeMode = (state: RootState) => state.theme.mode;
export const selectThemeColor = (state: RootState) => state.theme.color;
export const selectTheme = (state: RootState) => state.theme;
