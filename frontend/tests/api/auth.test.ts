// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '@api/auth';
import { apiClient } from '@api/client';
import * as parsers from '@api/parsers';

vi.mock('@api/client', () => ({
    apiClient: {
        getValidated: vi.fn(),
        postValidated: vi.fn(),
        patchValidated: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('axios', async (importOriginal) => {
    const actual = await importOriginal();
    const mod = actual as { default: { get: unknown } };
    return { ...actual, default: { ...mod.default, get: vi.fn().mockResolvedValue({}) } };
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('AuthApi', () => {
    describe('login', () => {
        it('posts to /sessions with credentials', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await auth.login({ email: 'a@b.com', password: 'secret' });
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                '/sessions',
                parsers.parseLoginResponse,
                { email: 'a@b.com', password: 'secret' },
            );
        });
    });

    describe('logout', () => {
        it('deletes /sessions/current', async () => {
            vi.mocked(apiClient.delete).mockResolvedValue(null);
            await auth.logout();
            expect(apiClient.delete).toHaveBeenCalledWith('/sessions/current');
        });
    });

    describe('me', () => {
        it('calls getValidated on /sessions/current', async () => {
            vi.mocked(apiClient.getValidated).mockResolvedValue(null);
            await auth.me();
            expect(apiClient.getValidated).toHaveBeenCalledWith('/sessions/current', parsers.parseUser);
        });
    });

    describe('updateProfile', () => {
        it('patches /users/:uuid with payload', async () => {
            vi.mocked(apiClient.patchValidated).mockResolvedValue(null);
            const uuid = 'u-001' as Parameters<typeof auth.updateProfile>[0];
            await auth.updateProfile(uuid, { name: 'New Name' });
            expect(apiClient.patchValidated).toHaveBeenCalledWith(
                '/users/u-001',
                parsers.parseUser,
                { name: 'New Name' },
            );
        });
    });

    describe('register', () => {
        it('posts to /users', async () => {
            vi.mocked(apiClient.postValidated).mockResolvedValue(null);
            await auth.register({
                name: 'Alice',
                email: 'alice@example.com',
                password: 'pass',
                password_confirmation: 'pass',
            });
            expect(apiClient.postValidated).toHaveBeenCalledWith(
                '/users',
                parsers.parseLoginResponse,
                expect.objectContaining({ name: 'Alice', email: 'alice@example.com' }),
            );
        });
    });

    describe('forgotPassword', () => {
        it('posts to /password-resets', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await auth.forgotPassword({ email: 'alice@example.com' });
            expect(apiClient.post).toHaveBeenCalledWith(
                '/password-resets',
                { email: 'alice@example.com' },
            );
        });
    });

    describe('resetPassword', () => {
        it('patches /password-resets/:token without token in body', async () => {
            vi.mocked(apiClient.patch).mockResolvedValue(null);
            await auth.resetPassword({
                token: 'tok-abc',
                email: 'a@b.com',
                password: 'new',
                password_confirmation: 'new',
            });
            expect(apiClient.patch).toHaveBeenCalledWith(
                '/password-resets/tok-abc',
                { email: 'a@b.com', password: 'new', password_confirmation: 'new' },
            );
        });
    });

    describe('resendVerification', () => {
        it('posts to /email-verifications', async () => {
            vi.mocked(apiClient.post).mockResolvedValue(null);
            await auth.resendVerification();
            expect(apiClient.post).toHaveBeenCalledWith('/email-verifications');
        });
    });
});
