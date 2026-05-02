import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { rootReducer } from './reducers';
import { persistMiddleware } from './persistMiddleware';

export type { RootState, AppDispatch } from './types';
import type { RootState, AppDispatch } from './types';

export const store = configureStore({
    reducer: rootReducer,
    middleware: getDefault => getDefault().concat(persistMiddleware.middleware),
});

// RootState and AppDispatch are derived in ./types to avoid the circular
// dependency with persistMiddleware, and re-exported above for convenience.

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
