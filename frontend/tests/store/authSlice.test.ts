// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, { authActions, fetchMe, signInThunk, signOutThunk } from '@store/authSlice';
import { STORAGE_KEYS } from '@utils/storageKeys';
import type { User } from '@models/user';

vi.mock('@api/auth', () => ({
    auth: {
        getCsrfCookie: vi.fn().mockResolvedValue(undefined),
        me: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
    },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reducer = authSlice.reducer;

function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: 1 as User['id'],
        name: 'Test User',
        email: 'test@example.com',
        bio: undefined,
        createdAt: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

function makeState(overrides: object = {}) {
    return {
        user: null as User | null,
        loading: true,
        sessionError: null as string | null,
        ...overrides,
    };
}

// ─── sessionExpired ───────────────────────────────────────────────────────────

describe('authSlice — sessionExpired', () => {
    it('sets user to null', () => {
        const state = makeState({ user: makeUser() });
        const next = reducer(state, authActions.sessionExpired('Token expired'));
        expect(next.user).toBeNull();
    });

    it('stores the error message in sessionError', () => {
        const state = makeState();
        const next = reducer(state, authActions.sessionExpired('Token expired'));
        expect(next.sessionError).toBe('Token expired');
    });
});

// ─── updateProfile ────────────────────────────────────────────────────────────

describe('authSlice — updateProfile', () => {
    it('updates name when provided', () => {
        const state = makeState({ user: makeUser({ name: 'Old Name' }) });
        const next = reducer(state, authActions.updateProfile({ name: 'New Name' }));
        expect(next.user?.name).toBe('New Name');
    });

    it('updates bio when provided', () => {
        const state = makeState({ user: makeUser() });
        const next = reducer(state, authActions.updateProfile({ bio: 'My bio' }));
        expect(next.user?.bio).toBe('My bio');
    });

    it('updates both name and bio simultaneously', () => {
        const state = makeState({ user: makeUser({ name: 'Old', bio: 'Old bio' }) });
        const next = reducer(state, authActions.updateProfile({ name: 'New', bio: 'New bio' }));
        expect(next.user?.name).toBe('New');
        expect(next.user?.bio).toBe('New bio');
    });

    it('does nothing when user is null', () => {
        const state = makeState({ user: null });
        const next = reducer(state, authActions.updateProfile({ name: 'New Name' }));
        expect(next.user).toBeNull();
    });

    it('does not alter bio when only name is in the payload', () => {
        const state = makeState({ user: makeUser({ bio: 'Existing bio' }) });
        const next = reducer(state, authActions.updateProfile({ name: 'New Name' }));
        expect(next.user?.bio).toBe('Existing bio');
    });
});

// ─── fetchMe ──────────────────────────────────────────────────────────────────

describe('authSlice — fetchMe', () => {
    it('sets user and clears loading on fulfilled', () => {
        const user = makeUser();
        const state = makeState({ loading: true });
        const next = reducer(state, fetchMe.fulfilled(user, ''));
        expect(next.user).toEqual(user);
        expect(next.loading).toBe(false);
    });

    it('clears loading and keeps user null on rejected', () => {
        const state = makeState({ loading: true, user: null });
        const next = reducer(state, fetchMe.rejected(null, ''));
        expect(next.loading).toBe(false);
        expect(next.user).toBeNull();
    });
});

// ─── signInThunk ──────────────────────────────────────────────────────────────

describe('authSlice — signInThunk', () => {
    it('sets user on fulfilled', () => {
        const user = makeUser();
        const state = makeState();
        const next = reducer(state, signInThunk.fulfilled(user, '', { email: '', password: '' }));
        expect(next.user).toEqual(user);
    });

    it('clears sessionError on fulfilled', () => {
        const state = makeState({ sessionError: 'Previous error' });
        const next = reducer(state, signInThunk.fulfilled(makeUser(), '', { email: '', password: '' }));
        expect(next.sessionError).toBeNull();
    });
});

// ─── signOutThunk ─────────────────────────────────────────────────────────────

describe('authSlice — signOutThunk', () => {
    it('sets user to null on fulfilled', () => {
        const state = makeState({ user: makeUser() });
        const next = reducer(state, signOutThunk.fulfilled(undefined, ''));
        expect(next.user).toBeNull();
    });
});

// ─── signOutThunk — localStorage cleanup ───────────────────────────────────

describe('authSlice — signOutThunk clears persisted localStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(auth.logout).mockResolvedValue({ ok: true, data: undefined } as never);
    });

    it('removes every key persistMiddleware writes, so a previous user\'s data cannot leak into the next login', async () => {
        const persistedKeys = [
            STORAGE_KEYS.WATCH_HISTORY,
            STORAGE_KEYS.LIKED_VIDEOS,
            STORAGE_KEYS.DISLIKED_VIDEOS,
            STORAGE_KEYS.VIDEO_PROGRESS,
            STORAGE_KEYS.AUTOPLAY,
            STORAGE_KEYS.PINNED_VIDEO,
            STORAGE_KEYS.SHORTS_MUTED,
            STORAGE_KEYS.SHORTS_VOLUME,
            STORAGE_KEYS.THEATER_MODE,
            STORAGE_KEYS.THEME_MODE,
            STORAGE_KEYS.THEME_COLOR,
            STORAGE_KEYS.SUBSCRIPTIONS,
            STORAGE_KEYS.PLAYLISTS,
            STORAGE_KEYS.RECENT_SEARCHES,
            STORAGE_KEYS.RECENT_CHANNELS,
        ];

        for (const key of persistedKeys) {
            localStorage.setItem(key, JSON.stringify(['leftover-from-previous-user']));
        }

        const store = configureStore({ reducer: { auth: authSlice.reducer } });
        await store.dispatch(signOutThunk());

        for (const key of persistedKeys) {
            expect(localStorage.getItem(key)).toBeNull();
        }
    });

    it('does not throw when localStorage is unavailable', async () => {
        const store = configureStore({ reducer: { auth: authSlice.reducer } });
        const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new DOMException('SecurityError');
        });

        await expect(store.dispatch(signOutThunk())).resolves.not.toThrow();

        removeSpy.mockRestore();
    });
});

// ─── signUpThunk ──────────────────────────────────────────────────────────────

import { signUpThunk } from '@store/authSlice';
import { auth } from '@api/auth';

describe('authSlice — signUpThunk (reducer)', () => {
    it('sets user on fulfilled', () => {
        const user = makeUser();
        const state = makeState();
        const next = reducer(state, signUpThunk.fulfilled(user, '', {
            name: 'Alice',
            email: 'alice@example.com',
            password: 'pass',
            password_confirmation: 'pass',
        }));
        expect(next.user).toEqual(user);
        expect(next.sessionError).toBeNull();
    });
});

describe('authSlice — fetchMe (execution)', () => {
    it('sets user when me() returns ok:true', async () => {
        const user = makeUser({ name: 'Logged' });
        vi.mocked(auth.me).mockResolvedValue({ ok: true, data: user } as never);

        const store = configureStore({ reducer: { auth: authSlice.reducer } });
        await store.dispatch(fetchMe());

        expect(store.getState().auth.user).toEqual(user);
        expect(store.getState().auth.loading).toBe(false);
    });

    it('sets user to null when me() returns ok:false', async () => {
        vi.mocked(auth.me).mockResolvedValue({ ok: false, error: 'Unauthenticated' } as never);

        const store = configureStore({ reducer: { auth: authSlice.reducer } });
        await store.dispatch(fetchMe());

        expect(store.getState().auth.user).toBeNull();
        expect(store.getState().auth.loading).toBe(false);
    });
});

describe('authSlice — signUpThunk (execution)', () => {
    it('calls register and sets user in the store on success', async () => {
        const user = makeUser({ name: 'Bob' });
        vi.mocked(auth.register).mockResolvedValue({ ok: true, data: { user } } as never);

        const store = configureStore({ reducer: { auth: authSlice.reducer } });
        await store.dispatch(signUpThunk({
            name: 'Bob',
            email: 'bob@example.com',
            password: 'pass123',
            password_confirmation: 'pass123',
        }));

        expect(auth.getCsrfCookie).toHaveBeenCalled();
        expect(auth.register).toHaveBeenCalled();
        expect(store.getState().auth.user).toEqual(user);
    });

    it('throws when register returns ok:false', async () => {
        vi.mocked(auth.register).mockResolvedValue({ ok: false, error: 'Email taken' } as never);

        const store = configureStore({ reducer: { auth: authSlice.reducer } });
        const result = await store.dispatch(signUpThunk({
            name: 'Bob',
            email: 'bob@example.com',
            password: 'pass123',
            password_confirmation: 'pass123',
        }));

        expect(result.type).toBe('auth/signUp/rejected');
        expect(store.getState().auth.user).toBeNull();
    });
});
