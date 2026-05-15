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

export interface RegisterPayload {
    name: string
    email: string
    password: string
    password_confirmation: string
}

export interface ForgotPasswordPayload {
    email: string
}

export interface ResetPasswordPayload {
    token: string
    email: string
    password: string
    password_confirmation: string
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

    async register(payload: RegisterPayload): Promise<LoginResponse | null> {
        return apiClient.postValidated(`${this.baseUrl}/register`, LoginResponseApiSchema, payload);
    }

    async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
        await apiClient.post(`${this.baseUrl}/password/forgot`, payload);
    }

    async resetPassword(payload: ResetPasswordPayload): Promise<void> {
        await apiClient.post(`${this.baseUrl}/password/reset`, payload);
    }

    async resendVerification(): Promise<void> {
        await apiClient.post(`${this.baseUrl}/email/resend`);
    }
}

export const auth = new AuthApi();
