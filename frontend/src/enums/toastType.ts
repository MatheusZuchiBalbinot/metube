export const ToastType = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
} as const;
export type ToastType = typeof ToastType[keyof typeof ToastType];
