import { createContext, useState } from 'react';
import { STORAGE_KEYS } from '@utils/storageKeys';
import type { ThemeMode, ThemeColor } from '@utils/themes';

export type { ThemeMode, ThemeColor };

export interface ThemeContextValue {
    mode: ThemeMode
    color: ThemeColor
    setMode: (mode: ThemeMode) => void
    setColor: (color: ThemeColor) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyMode(mode: ThemeMode) {
    document.documentElement.dataset.mode = mode;
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
}

function applyColor(color: ThemeColor) {
    document.documentElement.dataset.color = color;
    localStorage.setItem(STORAGE_KEYS.THEME_COLOR, color);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(() => {
        const stored = (localStorage.getItem(STORAGE_KEYS.THEME_MODE) as ThemeMode) ?? 'dark';
        document.documentElement.dataset.mode = stored;

        return stored;
    });

    const [color, setColorState] = useState<ThemeColor>(() => {
        const stored = (localStorage.getItem(STORAGE_KEYS.THEME_COLOR) as ThemeColor) ?? 'violet';
        document.documentElement.dataset.color = stored;

        return stored;
    });

    function setMode(next: ThemeMode) {
        applyMode(next);
        setModeState(next);
    }

    function setColor(next: ThemeColor) {
        applyColor(next);
        setColorState(next);
    }

    return (
        <ThemeContext.Provider value={{ mode, color, setMode, setColor }}>
            {children}
        </ThemeContext.Provider>
    );
}

