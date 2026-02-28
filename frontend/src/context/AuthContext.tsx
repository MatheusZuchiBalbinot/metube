import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as authApi from '../api/auth'
import type { User } from '../api/auth'

export interface AuthContextValue {
    user: User | null
    loading: boolean
    sessionError: string | null
    signIn: (email: string, password: string) => Promise<void>
    signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [sessionError, setSessionError] = useState<string | null>(null)

    const initialized = useRef(false)

    // Fetch CSRF cookie and re-hydrate user from session cookie on mount
    useEffect(() => {
        if (initialized.current) return
        initialized.current = true

        authApi.getCsrfCookie()
            .then(() => authApi.me())
            .then(setUser)
            .catch(() => null)
            .finally(() => setLoading(false))
    }, [])

    // Listen for expired-session events dispatched by the axios interceptor
    useEffect(() => {
        function onSessionExpired(e: Event) {
            setUser(null)
            setSessionError((e as CustomEvent<{ message: string }>).detail.message)
        }
        window.addEventListener('auth:session-expired', onSessionExpired)
        return () => window.removeEventListener('auth:session-expired', onSessionExpired)
    }, [t])

    const signIn = useCallback(async (email: string, password: string) => {
        const { user: userData } = await authApi.login({ email, password })
        setUser(userData)
        setSessionError(null)
    }, [])

    const signOut = useCallback(async () => {
        await authApi.logout().catch(() => null)
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, sessionError, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}
