// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import videoSlice from '@store/videoSlice';
import toastSlice from '@store/toastSlice';
import { makeVideo, vid } from '../../helpers/factories';

interface FakeTusHandlers {
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void
    onError?: () => void
    onSuccess?: (uploadKey: string | null) => void
}

const abortMock = vi.fn();

vi.mock('@lib/tus', () => ({
    // Mirrors the real `createTusUpload` shape (an object with `start`/`abort`)
    // closely enough for useBatchUpload's per-item tracking — resolves every
    // upload immediately via onSuccess, matching the old uploadViaTus mock's
    // `mockResolvedValue('batch-key')` behavior.
    createTusUpload: vi.fn((_file: File, handlers: FakeTusHandlers) => ({
        start: () => {
            void Promise.resolve().then(() => handlers.onSuccess?.('batch-key'));
        },
        abort: abortMock,
    })),
}));

vi.mock('@api/videos', () => ({
    video: { finalize: vi.fn() },
    toVuid: (s: string) => s,
}));

import { useBatchUpload } from '@components/upload/useBatchUpload';
import { video as videoApi } from '@api/videos';
import { createTusUpload } from '@lib/tus';

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = () => ({ ok: false as const, error: 'boom' });

function makeStore() {
    return configureStore({ reducer: { video: videoSlice.reducer, toast: toastSlice.reducer } });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

function makeDeps() {
    return { addVideo: vi.fn(), closeUploadModal: vi.fn(), addPollingVuid: vi.fn() };
}

function videoFile(name: string) {
    return new File(['v'], name, { type: 'video/mp4' });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useBatchUpload', () => {
    it('only enqueues video files and derives titles from filenames', () => {
        const { result } = renderHook(() => useBatchUpload(makeDeps()), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.addBatchFiles([
                videoFile('my_cool_clip.mp4'),
                new File(['t'], 'notes.txt', { type: 'text/plain' }),
            ]);
        });

        expect(result.current.batchItems).toHaveLength(1);
        expect(result.current.batchItems[0].title).toBe('My Cool Clip');
        expect(result.current.batchHasItems).toBe(true);
    });

    it('rejects a file over the max size and does not enqueue it', () => {
        const { result } = renderHook(() => useBatchUpload(makeDeps()), { wrapper: makeWrapper(makeStore()) });

        const oversized = videoFile('huge.mp4');
        Object.defineProperty(oversized, 'size', { value: 2048 * 1024 * 1024 + 1 });

        act(() => {
            result.current.addBatchFiles([oversized, videoFile('ok.mp4')]);
        });

        expect(result.current.batchItems).toHaveLength(1);
        expect(result.current.batchItems[0].file.name).toBe('ok.mp4');
    });

    it('rejects a duplicate file already in the queue (same name and size)', () => {
        const { result } = renderHook(() => useBatchUpload(makeDeps()), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.addBatchFiles([videoFile('a.mp4')]);
        });

        act(() => {
            result.current.addBatchFiles([videoFile('a.mp4'), videoFile('b.mp4')]);
        });

        expect(result.current.batchItems).toHaveLength(2);
        expect(result.current.batchItems.map(i => i.file.name)).toEqual(['a.mp4', 'b.mp4']);
    });

    it('rejects duplicate files within the same batch call', () => {
        const { result } = renderHook(() => useBatchUpload(makeDeps()), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.addBatchFiles([videoFile('a.mp4'), videoFile('a.mp4')]);
        });

        expect(result.current.batchItems).toHaveLength(1);
    });

    it('removes and renames queued items', () => {
        const { result } = renderHook(() => useBatchUpload(makeDeps()), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.addBatchFiles([videoFile('a.mp4')]);
        });
        const id = result.current.batchItems[0].id;

        act(() => {
            result.current.updateBatchTitle(id, 'Renamed');
        });
        expect(result.current.batchItems[0].title).toBe('Renamed');

        act(() => {
            result.current.removeBatchItem(id);
        });
        expect(result.current.batchItems).toHaveLength(0);
    });

    it('uploads all pending items and closes on full success', async () => {
        vi.mocked(videoApi.finalize).mockResolvedValue(ok(makeVideo({ id: vid('v-b') })));
        const deps = makeDeps();
        const { result } = renderHook(() => useBatchUpload(deps), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.addBatchFiles([videoFile('a.mp4'), videoFile('b.mp4')]);
        });

        await act(async () => {
            await result.current.handleBatchUpload();
        });

        expect(videoApi.finalize).toHaveBeenCalledTimes(2);
        expect(deps.addVideo).toHaveBeenCalledTimes(2);
        expect(deps.closeUploadModal).toHaveBeenCalledTimes(1);
        expect(result.current.batchItems).toHaveLength(0);
    });

    it('marks items as error and keeps the modal open when finalize fails', async () => {
        vi.mocked(videoApi.finalize).mockResolvedValue(fail());
        const deps = makeDeps();
        const { result } = renderHook(() => useBatchUpload(deps), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.addBatchFiles([videoFile('a.mp4')]);
        });

        await act(async () => {
            await result.current.handleBatchUpload();
        });

        expect(deps.closeUploadModal).not.toHaveBeenCalled();
        expect(result.current.batchItems[0].status).toBe('error');
    });

    // Finding: "Failed batch-upload items are a permanent dead end" — errored items
    // must be retriable, not just removable.
    it('retries a failed item and finalizes it on success', async () => {
        vi.mocked(videoApi.finalize)
            .mockResolvedValueOnce(fail())
            .mockResolvedValueOnce(ok(makeVideo({ id: vid('v-retry') })));
        const deps = makeDeps();
        const { result } = renderHook(() => useBatchUpload(deps), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.addBatchFiles([videoFile('a.mp4')]);
        });

        await act(async () => {
            await result.current.handleBatchUpload();
        });

        expect(result.current.batchItems[0].status).toBe('error');
        const id = result.current.batchItems[0].id;

        act(() => {
            result.current.retryBatchItem(id);
        });

        await waitFor(() => expect(result.current.batchItems[0].status).toBe('done'));
        expect(videoApi.finalize).toHaveBeenCalledTimes(2);
        expect(deps.addVideo).toHaveBeenCalledTimes(1);
    });

    // Finding: "Upload cannot be cancelled once started" — the batch path needs a
    // way to abort in-flight per-item tus uploads, not just the queue's own state.
    it('cancels in-flight uploads and clears the queue', async () => {
        vi.mocked(createTusUpload).mockImplementationOnce(() => ({
            // Never resolves — simulates an upload that is still transferring when cancelled.
            start: () => {},
            abort: abortMock,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double only needs start/abort, not the full tus.Upload surface
        } as any));
        const deps = makeDeps();
        const { result } = renderHook(() => useBatchUpload(deps), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.addBatchFiles([videoFile('a.mp4')]);
        });

        act(() => {
            void result.current.handleBatchUpload();
        });

        await waitFor(() => expect(result.current.isBatchUploading).toBe(true));

        act(() => {
            result.current.cancelBatchUpload();
        });

        expect(abortMock).toHaveBeenCalledTimes(1);
        expect(result.current.batchItems).toHaveLength(0);
        expect(result.current.isBatchUploading).toBe(false);
    });
});
