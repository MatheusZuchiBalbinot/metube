import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { auth } from '../api/auth';
import { STORAGE_KEYS } from '@utils';
import type { User } from '@models';

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
    const result = await auth.me();
    return result.ok ? result.data : null;
});

export const signInThunk = createAsyncThunk(
    'auth/signIn',
    async (payload: { email: string; password: string }) => {
        await auth.getCsrfCookie();
        const response = await auth.login(payload);

        if (!response.ok) {
            throw new Error('Login failed');
        }

        return response.data.user;
    },
);

export const signUpThunk = createAsyncThunk(
    'auth/signUp',
    async (payload: { name: string; email: string; password: string; password_confirmation: string }) => {
        await auth.getCsrfCookie();
        const response = await auth.register(payload);

        if (!response.ok) {
            throw new Error('Registration failed');
        }

        return response.data.user;
    },
);

/**
 * Every key persistMiddleware writes to localStorage. Cleared on logout so a
 * previous user's data (watch history, progress, likes, playlists, etc.) can
 * never leak into or be merged into the next user's account on a shared
 * machine. `rootReducer` already resets the
 * in-memory Redux state on `signOutThunk.fulfilled` — this clears the
 * persisted copy for belt-and-suspenders safety.
 */
const PERSISTED_STORAGE_KEYS: string[] = [
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

function clearPersistedStorage(): void {
    try {
        for (const key of PERSISTED_STORAGE_KEYS) {
            localStorage.removeItem(key);
        }
    } catch {
        // storage unavailable — nothing to clear; the in-memory reset via
        // rootReducer still applies regardless.
    }
}

export const signOutThunk = createAsyncThunk('auth/signOut', async () => {
    await auth.logout().catch(() => null);
    clearPersistedStorage();
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
            const user = state.user;
            if (user === null) {
                return;
            }

            if (action.payload.name !== undefined) {
                user.name = action.payload.name;
            }

            if (action.payload.bio !== undefined) {
                user.bio = action.payload.bio;
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
            .addCase(signUpThunk.fulfilled, (state, action) => {
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
