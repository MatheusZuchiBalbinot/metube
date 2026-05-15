import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ToastType } from '@enums/toastType';

export type { ToastType };

export interface ToastAction {
    label: string
    onClick: () => void
}

export interface Toast {
    id: string
    message: string
    type: ToastType
    action?: ToastAction
    duration?: number
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
            const id = crypto.randomUUID();
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
