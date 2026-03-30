// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import authSlice, { authActions, fetchMe, signInThunk, signOutThunk } from '@store/authSlice';
import type { User } from '@models/user';

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
