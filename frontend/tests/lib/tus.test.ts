// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tusState = vi.hoisted(() => ({
    onSuccess: null as (() => void) | null,
    onError: null as (() => void) | null,
    onProgress: null as ((b: number, t: number) => void) | null,
    url: 'http://localhost/api/uploads/tus/key-xyz' as string | null,
    start: vi.fn(),
}));

vi.mock('tus-js-client', () => ({
    Upload: class {
        constructor(_file: unknown, opts: {
            onSuccess: () => void;
            onError: () => void;
            onProgress: (b: number, t: number) => void;
        }) {
            tusState.onSuccess = opts.onSuccess;
            tusState.onError = opts.onError;
            tusState.onProgress = opts.onProgress;
        }
        get url() {
            return tusState.url;
        }
        start() {
            tusState.start();
        }
    },
}));

import {
    extractUploadKey,
    uploadViaTus,
    TUS_CHUNK_SIZE,
    TUS_RETRY_DELAYS,
    TUS_ENDPOINT,
} from '@lib/tus';

describe('extractUploadKey', () => {
    it('returns the last path segment of a tus URL', () => {
        expect(extractUploadKey('http://host/api/uploads/tus/abc123')).toBe('abc123');
    });

    it('returns null for null or undefined', () => {
        expect(extractUploadKey(null)).toBeNull();
        expect(extractUploadKey(undefined)).toBeNull();
    });

    it('returns null for an empty string', () => {
        expect(extractUploadKey('')).toBeNull();
    });
});

describe('tus config constants', () => {
    it('exposes the shared chunk size, retry policy and endpoint', () => {
        expect(TUS_CHUNK_SIZE).toBe(5 * 1024 * 1024);
        expect(TUS_RETRY_DELAYS).toEqual([0, 1_000, 3_000, 5_000, 10_000]);
        expect(TUS_ENDPOINT).toBe('/api/uploads/tus');
    });
});

describe('uploadViaTus', () => {
    beforeEach(() => {
        tusState.onSuccess = null;
        tusState.onError = null;
        tusState.onProgress = null;
        tusState.url = 'http://localhost/api/uploads/tus/key-xyz';
        tusState.start.mockReset();
    });

    it('starts the upload and resolves with the upload key on success', async () => {
        const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });
        const promise = uploadViaTus(file, () => undefined);

        expect(tusState.start).toHaveBeenCalled();
        tusState.onSuccess?.();

        await expect(promise).resolves.toBe('key-xyz');
    });

    it('resolves with null on error', async () => {
        const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });
        const promise = uploadViaTus(file, () => undefined);

        tusState.onError?.();

        await expect(promise).resolves.toBeNull();
    });

    it('reports rounded progress percentages', async () => {
        const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });
        const onProgress = vi.fn();
        const promise = uploadViaTus(file, onProgress);

        tusState.onProgress?.(1, 3);
        expect(onProgress).toHaveBeenCalledWith(33);

        tusState.onSuccess?.();
        await promise;
    });
});
