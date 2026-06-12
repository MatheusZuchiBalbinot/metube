// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import videoSlice from '@store/videoSlice';
import toastSlice from '@store/toastSlice';
import { makeVideo, vid } from '../../helpers/factories';

vi.mock('@lib/tus', () => ({
    uploadViaTus: vi.fn().mockResolvedValue('batch-key'),
}));

vi.mock('@api/videos', () => ({
    video: { finalize: vi.fn() },
    toVuid: (s: string) => s,
}));

import { useBatchUpload } from '@components/upload/useBatchUpload';
import { video as videoApi } from '@api/videos';
import { uploadViaTus } from '@lib/tus';

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
    vi.mocked(uploadViaTus).mockResolvedValue('batch-key');
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
});
