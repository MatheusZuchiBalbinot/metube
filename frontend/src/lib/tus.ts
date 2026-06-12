import * as tus from 'tus-js-client';

/**
 * Single source of truth for the resumable tus upload configuration.
 *
 * Both `useTusUpload` (single, with pause/resume) and `uploadViaTus` (batch,
 * fire-and-forget) build their `tus.Upload` instances from these constants and
 * helpers so the chunk size, retry policy and endpoint never drift apart.
 */

export const TUS_ENDPOINT = '/api/uploads/tus';
export const TUS_CHUNK_SIZE = 5 * 1024 * 1024;
export const TUS_RETRY_DELAYS = [0, 1_000, 3_000, 5_000, 10_000];

/**
 * Extracts the upload key (last path segment) from a tus upload URL.
 *
 * @param url - The `upload.url` produced by tus on success, possibly absent.
 * @returns The trailing path segment, or `null` when the URL is missing/empty.
 */
export function extractUploadKey(url: string | null | undefined): string | null {
    const isMissing = url === null || url === undefined;

    if (isMissing) {
        return null;
    }

    return url.split('/').pop() || null;
}

export interface TusUploadHandlers {
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void
    onError?: () => void
    onSuccess?: (uploadKey: string | null) => void
}

/**
 * Builds a `tus.Upload` for `file` wired to the shared endpoint, chunk size and
 * retry policy. Callers are responsible for calling `.start()` (optionally after
 * `findPreviousUploads()` for resume support).
 *
 * @param file - The file to upload.
 * @param handlers - Progress/error/success callbacks. `onSuccess` receives the
 *   extracted upload key (or `null` when the URL is missing).
 * @returns The configured upload instance.
 */
export function createTusUpload(file: File, handlers: TusUploadHandlers): tus.Upload {
    const upload = new tus.Upload(file, {
        endpoint: TUS_ENDPOINT,
        retryDelays: TUS_RETRY_DELAYS,
        chunkSize: TUS_CHUNK_SIZE,
        metadata: {
            filename: file.name,
            filetype: file.type,
        },
        onError: () => handlers.onError?.(),
        onProgress: (bytesUploaded, bytesTotal) => handlers.onProgress?.(bytesUploaded, bytesTotal),
        onSuccess: () => handlers.onSuccess?.(extractUploadKey(upload.url)),
    });

    return upload;
}

/**
 * Fire-and-forget tus upload used by batch mode (parallel via `Promise.all`).
 *
 * @param file - The file to upload.
 * @param onProgress - Receives the upload percentage (0–100).
 * @returns A promise resolving to the upload key, or `null` on error.
 */
export function uploadViaTus(file: File, onProgress: (percent: number) => void): Promise<string | null> {
    return new Promise((resolve) => {
        const upload = createTusUpload(file, {
            onProgress: (bytesUploaded, bytesTotal) => {
                const percent = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
                onProgress(percent);
            },
            onError: () => resolve(null),
            onSuccess: uploadKey => resolve(uploadKey),
        });

        upload.start();
    });
}
