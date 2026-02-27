import client from './client'

export interface User {
    id: number
    name: string
    email: string
    verified: boolean
    created_at: string
}

export interface LoginPayload {
    email: string
    password: string
}

export interface TokenResponse {
    access_token: string
    token_type: string
    expires_in: number
    user: User
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
    const { data } = await client.post<TokenResponse>('/auth/login', payload)
    return data
}

export async function logout(): Promise<void> {
    await client.post('/auth/logout')
}

export async function me(): Promise<User> {
    const { data } = await client.get<User>('/auth/me')
    return data
}
