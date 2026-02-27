import { createContext, useContext, useState } from 'react'

export type ThemeMode  = 'dark' | 'light'
export type ThemeColor = 'violet' | 'blue' | 'green' | 'rose' | 'amber'

interface ThemeContextValue {
    mode:  ThemeMode
    color: ThemeColor
    setMode:  (mode: ThemeMode) => void
    setColor: (color: ThemeColor) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyMode(mode: ThemeMode) {
    document.documentElement.dataset.mode = mode
    localStorage.setItem('theme-mode', mode)
}

function applyColor(color: ThemeColor) {
    document.documentElement.dataset.color = color
    localStorage.setItem('theme-color', color)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // State initializers run synchronously — this prevents FOUC
    const [mode, setModeState] = useState<ThemeMode>(() => {
        const stored = (localStorage.getItem('theme-mode') as ThemeMode) ?? 'dark'
        document.documentElement.dataset.mode = stored
        return stored
    })

    const [color, setColorState] = useState<ThemeColor>(() => {
        const stored = (localStorage.getItem('theme-color') as ThemeColor) ?? 'violet'
        document.documentElement.dataset.color = stored
        return stored
    })

    function setMode(next: ThemeMode) {
        applyMode(next)
        setModeState(next)
    }

    function setColor(next: ThemeColor) {
        applyColor(next)
        setColorState(next)
    }

    return (
        <ThemeContext.Provider value={{ mode, color, setMode, setColor }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
    return ctx
}
