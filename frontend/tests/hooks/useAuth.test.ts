// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import authSlice from '@store/authSlice';
import videoSlice from '@store/videoSlice';
import themeSlice from '@store/themeSlice';
import toastSlice from '@store/toastSlice';
import subscriptionSlice from '@store/subscriptionSlice';
import playlistSlice from '@store/playlistSlice';
import searchSlice from '@store/searchSlice';
import commentSlice from '@store/commentSlice';
import { makeUser } from '../helpers/factories';

vi.mock('@api/auth', () => ({
    auth: {
        getCsrfCookie: vi.fn().mockResolvedValue(undefined),
        login: vi.fn(),
        logout: vi.fn().mockResolvedValue(undefined),
        me: vi.fn(),
        register: vi.fn(),
        updateProfile: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
        resendVerification: vi.fn(),
    },
}));

import { auth } from '@api/auth';

function makeStore(preloaded = {}) {
    return configureStore({
        reducer: {
            auth: authSlice.reducer,
            video: videoSlice.reducer,
            theme: themeSlice.reducer,
            toast: toastSlice.reducer,
            subscription: subscriptionSlice.reducer,
            playlist: playlistSlice.reducer,
            search: searchSlice.reducer,
            comment: commentSlice.reducer,
        },
        preloadedState: preloaded,
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
            Provider,
            { store },
            React.createElement(MemoryRouter, null, children),
        );
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useAuth', () => {
    it('exposes user from auth store', () => {
        const user = makeUser();
        const store = makeStore({ auth: { user, loading: false, sessionError: null } });
        const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
        expect(result.current.user).toEqual(user);
    });

    it('exposes loading and sessionError from auth store', () => {
        const store = makeStore({ auth: { user: null, loading: true, sessionError: null } });
        const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
        expect(result.current.loading).toBe(true);
        expect(result.current.sessionError).toBeNull();
    });

    it('signIn dispatches signInThunk and calls getCsrfCookie + login', async () => {
        vi.mocked(auth.login).mockResolvedValue({ user: makeUser() });
        const store = makeStore();
        const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });

        await act(async () => {
            await result.current.signIn('test@example.com', 'pass');
        });

        expect(auth.getCsrfCookie).toHaveBeenCalled();
        expect(auth.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pass' });
    });

    it('signIn sets user in store on success', async () => {
        const user = makeUser({ name: 'Alice' });
        vi.mocked(auth.login).mockResolvedValue({ user });
        const store = makeStore();
        const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });

        await act(async () => {
            await result.current.signIn('alice@example.com', 'pass');
        });

        expect(result.current.user?.name).toBe('Alice');
    });

    it('signOut calls auth.logout', async () => {
        vi.mocked(auth.logout).mockResolvedValue(undefined);
        const store = makeStore({ auth: { user: makeUser(), loading: false, sessionError: null } });
        const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });

        await act(async () => {
            await result.current.signOut();
        });

        expect(auth.logout).toHaveBeenCalled();
    });

    it('updateProfile updates user name in store', () => {
        const user = makeUser({ name: 'Old Name' });
        const store = makeStore({ auth: { user, loading: false, sessionError: null } });
        const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });

        act(() => {
            result.current.updateProfile('New Name', undefined);
        });

        expect(result.current.user?.name).toBe('New Name');
    });
});

import { fetchMe } from '@store/authSlice';
import { act as actNative } from '@testing-library/react';

describe('fetchMe thunk', () => {
    it('fetches CSRF and calls auth.me', async () => {
        vi.mocked(auth.me).mockResolvedValue(makeUser());
        const store = makeStore();

        await actNative(async () => {
            await store.dispatch(fetchMe());
        });

        expect(auth.getCsrfCookie).toHaveBeenCalled();
        expect(auth.me).toHaveBeenCalled();
        expect(store.getState().auth.user).toBeDefined();
    });
});
