export const UploadStatus = {
    IDLE: 'idle',
    UPLOADING: 'uploading',
    DONE: 'done',
    ERROR: 'error',
} as const;
export type UploadStatus = typeof UploadStatus[keyof typeof UploadStatus];
