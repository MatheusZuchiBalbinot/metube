import axios from 'axios';
import { apiClient } from './client';
import type { User } from '@models/user';
import { UserApiSchema, LoginResponseApiSchema } from '@validation';

export type { User } from '@models/user';

export interface LoginPayload {
    email: string
    password: string
}

export interface LoginResponse {
    user: User
}

export interface UpdateProfilePayload {
    name?: string
    bio?: string
}

class AuthApi {
    private readonly baseUrl = '/auth';
    private readonly csrfUrl = '/sanctum/csrf-cookie';

    async getCsrfCookie(): Promise<void> {
        await axios.get(this.csrfUrl, { withCredentials: true });
    }

    async login(payload: LoginPayload): Promise<LoginResponse | null> {
        return apiClient.postValidated(`${this.baseUrl}/login`, LoginResponseApiSchema, payload);
    }

    async logout(): Promise<void> {
        await apiClient.post(`${this.baseUrl}/logout`);
    }

    async me(): Promise<User | null> {
        return apiClient.getValidated(`${this.baseUrl}/me`, UserApiSchema);
    }

    async updateProfile(payload: UpdateProfilePayload): Promise<User | null> {
        return apiClient.patchValidated(`${this.baseUrl}/me`, UserApiSchema, payload);
    }
}

export const auth = new AuthApi();
