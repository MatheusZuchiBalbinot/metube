import type { RootState } from './types';

export const selectToasts = (state: RootState) => state.toast.toasts;
