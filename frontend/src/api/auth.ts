import axios from 'axios';
import { apiClient } from './client';
import type { User } from '@models/user';
import type { Uuid } from './channels';
import { parseUser, parseLoginResponse, type LoginApiResponse } from './parsers';

export type { User } from '@models/user';

export type LoginResponse = LoginApiResponse;

export interface LoginPayload {
    email: string
    password: string
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
    private readonly csrfUrl = '/sanctum/csrf-cookie';

    async getCsrfCookie(): Promise<void> {
        await axios.get(this.csrfUrl, { withCredentials: true });
    }

    async login(payload: LoginPayload): Promise<LoginResponse | null> {
        return apiClient.postValidated('/sessions', parseLoginResponse, payload);
    }

    async logout(): Promise<void> {
        await apiClient.delete('/sessions/current');
    }

    async me(): Promise<User | null> {
        return apiClient.getValidated('/sessions/current', parseUser);
    }

    async updateProfile(uuid: Uuid, payload: UpdateProfilePayload): Promise<User | null> {
        return apiClient.patchValidated(`/users/${uuid}`, parseUser, payload);
    }

    async register(payload: RegisterPayload): Promise<LoginResponse | null> {
        return apiClient.postValidated('/users', parseLoginResponse, payload);
    }

    async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
        await apiClient.post('/password-resets', payload);
    }

    async resetPassword(payload: ResetPasswordPayload): Promise<void> {
        const { token, ...body } = payload;
        await apiClient.patch(`/password-resets/${token}`, body);
    }

    async resendVerification(): Promise<void> {
        await apiClient.post('/email-verifications');
    }
}

export const auth = new AuthApi();
