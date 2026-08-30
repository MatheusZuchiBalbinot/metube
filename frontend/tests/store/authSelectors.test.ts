// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { authActions } from '@store/authSlice';
import { selectAuthUser, selectAuthLoading, selectAuthSessionError, selectAuth } from '@store/authSelectors';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

describe('authSelectors', () => {
    it('selectAuthUser returns null before sign in', () => {
        const store = makeStore();
        expect(selectAuthUser(store.getState())).toBeNull();
    });

    it('selectAuthLoading starts true (bootstrap in progress) and clears once resolved', () => {
        const store = makeStore();
        expect(selectAuthLoading(store.getState())).toBe(true);

        store.dispatch({ type: 'auth/fetchMe/rejected' });
        expect(selectAuthLoading(store.getState())).toBe(false);
    });

    it('selectAuthSessionError reflects a session-expired error', () => {
        const store = makeStore();
        store.dispatch(authActions.sessionExpired('Token expired'));

        expect(selectAuthSessionError(store.getState())).toBe('Token expired');
        expect(selectAuthUser(store.getState())).toBeNull();
    });

    it('selectAuth returns the whole auth slice', () => {
        const store = makeStore();
        expect(selectAuth(store.getState())).toBe(store.getState().auth);
    });
});
