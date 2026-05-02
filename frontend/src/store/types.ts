import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './reducers';

// Phantom store used only for type derivation — no middleware needed here.
// Exists to break the circular dependency: index.ts → persistMiddleware → types.ts.
const _typeStore = configureStore({ reducer: rootReducer });

export type RootState = ReturnType<typeof _typeStore.getState>;
export type AppDispatch = typeof _typeStore.dispatch;
