// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Shared state for the mock — must be defined before vi.mock is hoisted
const tusState = vi.hoisted(() => ({
    onSuccess: null as (() => void) | null,
    onError: null as (() => void) | null,
    onProgress: null as ((b: number, t: number) => void) | null,
    url: 'http://localhost/api/uploads/tus/abc123' as string | null,
    start: vi.fn(),
    abort: vi.fn(),
    findPreviousUploads: vi.fn().mockResolvedValue([]),
    resumeFromPreviousUpload: vi.fn(),
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
        abort() {
            tusState.abort();
        }
        findPreviousUploads() {
            return tusState.findPreviousUploads();
        }
        resumeFromPreviousUpload(p: unknown) {
            tusState.resumeFromPreviousUpload(p);
        }
    },
}));

import { useTusUpload } from '@hooks/useTusUpload';
import { UploadStatus } from '@enums/uploadStatus';

describe('useTusUpload', () => {
    beforeEach(() => {
        tusState.onSuccess = null;
        tusState.onError = null;
        tusState.onProgress = null;
        tusState.url = 'http://localhost/api/uploads/tus/abc123';
        tusState.start.mockReset();
        tusState.abort.mockReset();
        tusState.findPreviousUploads.mockReset().mockResolvedValue([]);
        tusState.resumeFromPreviousUpload.mockReset();
    });

    it('starts with IDLE status and null progress', () => {
        const { result } = renderHook(() => useTusUpload());
        expect(result.current.status).toBe(UploadStatus.IDLE);
        expect(result.current.progress).toBeNull();
    });

    it('uploadFile resolves with uploadKey on success', async () => {
        const { result } = renderHook(() => useTusUpload());
        const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

        let resolvedKey: unknown;

        await act(async () => {
            const promise = result.current.uploadFile(file);
            await new Promise(res => setTimeout(res, 0));
            tusState.onSuccess?.();
            resolvedKey = await promise;
        });

        expect(resolvedKey).toEqual({ uploadKey: 'abc123' });
        expect(result.current.status).toBe(UploadStatus.DONE);
    });

    it('uploadFile resolves with null and sets ERROR on tus error', async () => {
        const { result } = renderHook(() => useTusUpload());
        const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

        let resolvedValue: unknown;

        await act(async () => {
            const promise = result.current.uploadFile(file);
            await new Promise(res => setTimeout(res, 0));
            tusState.onError?.();
            resolvedValue = await promise;
        });

        expect(resolvedValue).toBeNull();
        expect(result.current.status).toBe(UploadStatus.ERROR);
    });

    it('uploadFile resolves with null when upload URL is null', async () => {
        tusState.url = null;
        const { result } = renderHook(() => useTusUpload());
        const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

        let resolvedValue: unknown;

        await act(async () => {
            const promise = result.current.uploadFile(file);
            await new Promise(res => setTimeout(res, 0));
            tusState.onSuccess?.();
            resolvedValue = await promise;
        });

        expect(resolvedValue).toBeNull();
        expect(result.current.status).toBe(UploadStatus.ERROR);
    });

    it('onProgress updates progress state', async () => {
        const { result } = renderHook(() => useTusUpload());
        const file = new File(['x'.repeat(10)], 'video.mp4', { type: 'video/mp4' });

        await act(async () => {
            result.current.uploadFile(file);
            await new Promise(res => setTimeout(res, 0));
            tusState.onProgress?.(5, 10);
        });

        expect(result.current.progress?.percent).toBe(50);
        expect(result.current.progress?.loaded).toBe(5);
        expect(result.current.progress?.total).toBe(10);
    });

    it('pause calls abort and sets status to IDLE', async () => {
        const { result } = renderHook(() => useTusUpload());
        const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

        await act(async () => {
            result.current.uploadFile(file);
            await new Promise(res => setTimeout(res, 0));
        });

        act(() => {
            result.current.pause();
        });

        expect(tusState.abort).toHaveBeenCalled();
        expect(result.current.status).toBe(UploadStatus.IDLE);
    });

    it('resume calls start and sets status to UPLOADING', async () => {
        const { result } = renderHook(() => useTusUpload());
        const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

        await act(async () => {
            result.current.uploadFile(file);
            await new Promise(res => setTimeout(res, 0));
            result.current.pause();
        });

        act(() => {
            result.current.resume();
        });

        expect(tusState.start).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe(UploadStatus.UPLOADING);
    });

    it('reset clears progress and returns to IDLE', async () => {
        const { result } = renderHook(() => useTusUpload());
        const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

        await act(async () => {
            result.current.uploadFile(file);
            await new Promise(res => setTimeout(res, 0));
            tusState.onProgress?.(5, 10);
        });

        act(() => {
            result.current.reset();
        });

        expect(result.current.progress).toBeNull();
        expect(result.current.status).toBe(UploadStatus.IDLE);
    });

    it('resumes from a previous upload when one exists', async () => {
        tusState.findPreviousUploads.mockResolvedValue([{ id: 'prev-upload' }]);
        const { result } = renderHook(() => useTusUpload());
        const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

        await act(async () => {
            result.current.uploadFile(file);
            await new Promise(res => setTimeout(res, 0));
        });

        expect(tusState.resumeFromPreviousUpload).toHaveBeenCalledWith({ id: 'prev-upload' });
    });
});
