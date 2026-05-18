export const UploadMode = {
    SINGLE: 'single',
    BATCH: 'batch',
} as const;
export type UploadMode = typeof UploadMode[keyof typeof UploadMode];
