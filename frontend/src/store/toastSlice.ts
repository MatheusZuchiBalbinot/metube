import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
}

interface ToastState {
    toasts: Toast[]
}

const MAX_TOASTS = 3;
const initialState: ToastState = { toasts: [] };

const toastSlice = createSlice({
    name: 'toast',
    initialState,
    reducers: {
        addToast(state, action: PayloadAction<Omit<Toast, 'id'>>) {
            const id = `t${Date.now()}`;
            state.toasts.push({ ...action.payload, id });
            if (state.toasts.length > MAX_TOASTS) {
                state.toasts.shift();
            }
        },
        removeToast(state, action: PayloadAction<string>) {
            state.toasts = state.toasts.filter(t => t.id !== action.payload);
        },
    },
});

export const toastActions = toastSlice.actions;
export default toastSlice;
