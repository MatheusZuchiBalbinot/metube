// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import videoSlice from '@store/videoSlice';
import videoUiSlice from '@store/videoUiSlice';
import playbackSlice from '@store/playbackSlice';
import toastSlice from '@store/toastSlice';
import { UploadMode } from '@enums/uploadMode';
import { makeVideoState, makeVideoUiState, makePlaybackState, makeVideo, vid, tag } from '../../helpers/factories';

vi.mock('@hooks/useTusUpload', () => ({
    useTusUpload: () => ({
        progress: null,
        status: 'idle',
        uploadFile: vi.fn().mockResolvedValue({ uploadKey: 'vkey' }),
        pause: vi.fn(),
        resume: vi.fn(),
        reset: vi.fn(),
    }),
}));

const abortMock = vi.fn();

interface FakeTusHandlers {
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void
    onError?: () => void
    onSuccess?: (uploadKey: string | null) => void
}

vi.mock('@lib/tus', () => ({
    // Never resolves by default — lets tests catch the batch upload mid-flight
    // (isBatchUploading === true) to exercise the cancel flow.
    createTusUpload: vi.fn((_file: File, _handlers: FakeTusHandlers) => ({
        start: () => {},
        abort: abortMock,
    })),
}));

vi.mock('@api/videos', () => ({
    video: { finalize: vi.fn() },
    toVuid: (s: string) => s,
}));

import { useUploadModal } from '@components/upload/useUploadModal';

function makeStore({ video = {}, videoUi = {} }: { video?: object; videoUi?: object } = {}) {
    return configureStore({
        reducer: {
            video: videoSlice.reducer,
            videoUi: videoUiSlice.reducer,
            playback: playbackSlice.reducer,
            toast: toastSlice.reducer,
        },
        preloadedState: {
            video: makeVideoState(video),
            videoUi: makeVideoUiState(videoUi),
            playback: makePlaybackState(),
            toast: { toasts: [] },
        },
    });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, React.createElement(MemoryRouter, null, children));
    };
}

function videoFile(name: string) {
    return new File(['v'], name, { type: 'video/mp4' });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useUploadModal', () => {
    it('derives existing tags from the store, deduplicated and sorted', () => {
        const store = makeStore({
            video: {
                videos: [
                    makeVideo({ id: vid('v1'), tags: [tag('react'), tag('test')] }),
                    makeVideo({ id: vid('v2'), tags: [tag('react'), tag('app')] }),
                ],
            },
        });

        const { result } = renderHook(() => useUploadModal(), { wrapper: makeWrapper(store) });

        expect(result.current.existingTags).toEqual([tag('app'), tag('react'), tag('test')]);
    });

    it('starts in single mode and switches between modes', () => {
        const { result } = renderHook(() => useUploadModal(), { wrapper: makeWrapper(makeStore()) });

        expect(result.current.mode).toBe(UploadMode.SINGLE);

        act(() => {
            result.current.handleModeToBatch();
        });
        expect(result.current.mode).toBe(UploadMode.BATCH);

        act(() => {
            result.current.handleModeToSingle();
        });
        expect(result.current.mode).toBe(UploadMode.SINGLE);
    });

    it('reflects the store open flag and closes the modal', () => {
        const store = makeStore({ videoUi: { uploadModalOpen: true } });
        const { result } = renderHook(() => useUploadModal(), { wrapper: makeWrapper(store) });

        expect(result.current.uploadModalOpen).toBe(true);

        act(() => {
            result.current.handleClose();
        });

        expect(store.getState().videoUi.uploadModalOpen).toBe(false);
    });

    it('exposes a combined, not busy state by default', () => {
        const { result } = renderHook(() => useUploadModal(), { wrapper: makeWrapper(makeStore()) });

        expect(result.current.isBusy).toBe(false);
        expect(result.current.pollingVuids).toEqual([]);
        expect(typeof result.current.runSingleUpload).toBe('function');
        expect(typeof result.current.handleBatchUpload).toBe('function');
    });

    // Finding: "Upload cannot be cancelled once started" — handleClose used to no-op
    // silently whenever isBusy was true (X button, Escape, backdrop click, and the
    // footer Cancel button all route through it). It must now open a confirmation
    // instead of swallowing the close attempt, and confirming must abort the
    // in-flight upload and actually close the modal.
    it('opens a cancel confirmation instead of no-op closing while busy, and aborts on confirm', async () => {
        const store = makeStore({ videoUi: { uploadModalOpen: true } });
        const { result } = renderHook(() => useUploadModal(), { wrapper: makeWrapper(store) });

        act(() => {
            result.current.handleModeToBatch();
            result.current.addBatchFiles([videoFile('a.mp4')]);
        });

        act(() => {
            void result.current.handleBatchUpload();
        });

        await waitFor(() => expect(result.current.isBusy).toBe(true));

        act(() => {
            result.current.handleClose();
        });

        expect(result.current.cancelConfirmOpen).toBe(true);
        expect(store.getState().videoUi.uploadModalOpen).toBe(true);

        act(() => {
            result.current.confirmCancelUpload();
        });

        expect(abortMock).toHaveBeenCalled();
        expect(result.current.cancelConfirmOpen).toBe(false);
        expect(store.getState().videoUi.uploadModalOpen).toBe(false);
    });
});
