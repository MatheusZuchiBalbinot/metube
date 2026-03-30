/**
 * Store type derivation — exists to break the circular dependency between
 * index.ts (which imports persistMiddleware) and persistMiddleware.ts (which
 * needs RootState/AppDispatch from index.ts).
 *
 * This file derives the types from the reducer shape alone, with no reference
 * to the middleware, so it can be safely imported by any store file.
 */
import { configureStore } from '@reduxjs/toolkit';
import videoSlice from './videoSlice';
import themeSlice from './themeSlice';
import authSlice from './authSlice';
import toastSlice from './toastSlice';
import subscriptionSlice from './subscriptionSlice';
import playlistSlice from './playlistSlice';
import searchSlice from './searchSlice';

const _typeStore = configureStore({
    reducer: {
        video: videoSlice.reducer,
        theme: themeSlice.reducer,
        auth: authSlice.reducer,
        toast: toastSlice.reducer,
        subscription: subscriptionSlice.reducer,
        playlist: playlistSlice.reducer,
        search: searchSlice.reducer,
    },
});

export type RootState = ReturnType<typeof _typeStore.getState>;
export type AppDispatch = typeof _typeStore.dispatch;
