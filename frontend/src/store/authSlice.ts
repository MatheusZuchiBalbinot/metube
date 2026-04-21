import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { auth } from '../api/auth';
import type { User } from '@models/user';

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
    await auth.getCsrfCookie();
    const me = await auth.me();
    return me;
});

export const signInThunk = createAsyncThunk(
    'auth/signIn',
    async (payload: { email: string; password: string }) => {
        await auth.getCsrfCookie();
        const response = await auth.login(payload);
        if (!response) throw new Error('Login failed');
        return response.user;
    },
);

export const signOutThunk = createAsyncThunk('auth/signOut', async () => {
    await auth.logout().catch(() => null);
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        sessionExpired(state, action: PayloadAction<string>) {
            state.user = null;
            state.sessionError = action.payload;
        },

        updateProfile(state, action: PayloadAction<{ name?: string; bio?: string }>) {
            const hasNoUser = state.user === null;
            if (hasNoUser) {
                return;
            }

            const hasName = action.payload.name !== undefined;
            const hasBio = action.payload.bio !== undefined;
            if (hasName) {
                state.user!.name = action.payload.name!;
            }

            if (hasBio) {
                state.user!.bio = action.payload.bio;
            }
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
