import type { ThemeColor, ThemeMode } from '@utils';

export const THEME_COLORS: { key: ThemeColor; hex: string; label: string }[] = [
    { key: 'violet', hex: '#7c3aed', label: 'Violet' },
    { key: 'blue', hex: '#2563eb', label: 'Blue' },
    { key: 'green', hex: '#059669', label: 'Green' },
    { key: 'rose', hex: '#e11d48', label: 'Rose' },
    { key: 'amber', hex: '#d97706', label: 'Amber' },
];

export const THEME_MODES: { key: ThemeMode; labelKey: string }[] = [
    { key: 'dark', labelKey: 'preferences.dark' },
    { key: 'light', labelKey: 'preferences.light' },
];

export const LANGUAGES = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'pt', label: 'PT', name: 'Português' },
];
