import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import * as authApi from '../api/auth';
import type { User } from '../api/auth';

interface AuthState {
    user: User | null
    loading: boolean
    sessionError: string | null
}

const initialState: AuthState = {
    user: null,
    loading: true,
    sessionError: null,
};

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
    await authApi.getCsrfCookie();
    return authApi.me();
});

export const signInThunk = createAsyncThunk(
    'auth/signIn',
    async (payload: { email: string; password: string }) => {
        const { user } = await authApi.login(payload);
        return user;
    },
);

export const signOutThunk = createAsyncThunk('auth/signOut', async () => {
    await authApi.logout().catch(() => null);
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        sessionExpired(state, action: PayloadAction<string>) {
            state.user = null;
            state.sessionError = action.payload;
        },
    },
    extraReducers: builder => {
        builder
            .addCase(fetchMe.fulfilled, (state, action) => {
                state.user = action.payload;
                state.loading = false;
            })
            .addCase(fetchMe.rejected, state => {
                state.loading = false;
            })
            .addCase(signInThunk.fulfilled, (state, action) => {
                state.user = action.payload;
                state.sessionError = null;
            })
            .addCase(signOutThunk.fulfilled, state => {
                state.user = null;
            });
    },
});

export const authActions = authSlice.actions;
export default authSlice;
