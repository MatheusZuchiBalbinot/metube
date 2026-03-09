import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import videoSlice from './videoSlice';
import themeSlice from './themeSlice';
import authSlice from './authSlice';
import toastSlice from './toastSlice';
import { localStorageMiddleware } from './localStorageMiddleware';

export const store = configureStore({
    reducer: {
        video: videoSlice.reducer,
        theme: themeSlice.reducer,
        auth: authSlice.reducer,
        toast: toastSlice.reducer,
    },
    middleware: getDefault => getDefault().concat(localStorageMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
