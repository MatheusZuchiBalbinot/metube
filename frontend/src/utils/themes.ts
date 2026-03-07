export const THEME_MODES = ['dark', 'light'] as const;
export const THEME_COLORS = ['violet', 'blue', 'green', 'rose', 'amber'] as const;

export type ThemeMode = typeof THEME_MODES[number];
export type ThemeColor = typeof THEME_COLORS[number];
