import axios from 'axios';
import client from './client';

export interface User {
    id: number
    name: string
    email: string
    bio?: string
    created_at: string
}

export interface LoginPayload {
    email: string
    bio?: string
    password: string
}

export interface LoginResponse {
    user: User
}

export async function getCsrfCookie(): Promise<void> {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await client.post<LoginResponse>('/auth/login', payload);
    return data;
}

export async function logout(): Promise<void> {
    await client.post('/auth/logout');
}

export async function me(): Promise<User> {
    const { data } = await client.get<User>('/auth/me');
    return data;
}
