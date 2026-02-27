import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import i18n from '../i18n'

const client = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
})

// Attach stored token to every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ─── Silent token refresh on 401 ─────────────────────────────────────────────

let isRefreshing = false
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function drainQueue(error: unknown, token: string | null = null) {
    pendingQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token!))
    pendingQueue = []
}

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean }

function shouldSkipRefresh(error: AxiosError, original: RetryableConfig): boolean {
    const isUnauthorized = error.response?.status === 401
    const isRefreshEndpoint = original.url?.includes('/auth/refresh')
    return !isUnauthorized || Boolean(original._retry) || Boolean(isRefreshEndpoint)
}

function enqueueRequest(original: RetryableConfig): Promise<unknown> {
    return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
    }).then((newToken) => {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
        return client(original)
    })
}

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original: RetryableConfig = error.config ?? {}

        if (shouldSkipRefresh(error, original)) {
            return Promise.reject(error)
        }

        if (isRefreshing) {
            return enqueueRequest(original)
        }

        original._retry = true
        isRefreshing = true

        try {
            const { data } = await client.post<{ access_token: string }>('/auth/refresh')
            const newToken = data.access_token
            localStorage.setItem('token', newToken)
            drainQueue(null, newToken)
            original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
            return client(original)
        } catch (refreshError) {
            drainQueue(refreshError)
            localStorage.removeItem('token')
            window.dispatchEvent(new CustomEvent('auth:session-expired', {
                detail: { message: i18n.t('auth.session_expired') },
            }))
            return Promise.reject(refreshError)
        } finally {
            isRefreshing = false
        }
    },
)

export default client
