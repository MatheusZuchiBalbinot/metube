// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import videoSlice from '@store/videoSlice';
import toastSlice from '@store/toastSlice';
import { makeVideo, vid } from '../../helpers/factories';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof ReactRouterDom>();
    return { ...actual, useNavigate: () => navigate };
});

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

vi.mock('@api/videos', () => ({
    video: { finalize: vi.fn() },
    toVuid: (s: string) => s,
}));

import { useSingleUpload } from '@components/upload/useSingleUpload';
import { video as videoApi } from '@api/videos';

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = () => ({ ok: false as const, error: 'boom' });

function makeStore() {
    return configureStore({ reducer: { video: videoSlice.reducer, toast: toastSlice.reducer } });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, React.createElement(MemoryRouter, null, children));
    };
}

function makeDeps() {
    return { addVideo: vi.fn(), closeUploadModal: vi.fn(), addPollingVuid: vi.fn() };
}

beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock') as unknown as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
});

describe('useSingleUpload', () => {
    it('rejects an empty title: sets titleError, shakes, does not finalize', async () => {
        const deps = makeDeps();
        const { result } = renderHook(() => useSingleUpload(deps), { wrapper: makeWrapper(makeStore()) });

        await act(async () => {
            await result.current.runSingleUpload();
        });

        expect(result.current.form.titleError).not.toBeNull();
        expect(result.current.titleShakeKey).toBe(1);
        expect(videoApi.finalize).not.toHaveBeenCalled();
    });

    it('requires a video file when a title is present', async () => {
        const deps = makeDeps();
        const { result } = renderHook(() => useSingleUpload(deps), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.handleTitleChange({ target: { value: 'My clip' } } as React.ChangeEvent<HTMLInputElement>);
        });

        await act(async () => {
            await result.current.runSingleUpload();
        });

        expect(videoApi.finalize).not.toHaveBeenCalled();
    });

    it('uploads, finalizes, registers polling and navigates on success', async () => {
        vi.mocked(videoApi.finalize).mockResolvedValue(ok(makeVideo({ id: vid('v-new') })));
        const deps = makeDeps();
        const { result } = renderHook(() => useSingleUpload(deps), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.handleTitleChange({ target: { value: 'My clip' } } as React.ChangeEvent<HTMLInputElement>);
            result.current.handleVideoFile(new File(['v'], 'v.mp4', { type: 'video/mp4' }));
        });

        await act(async () => {
            await result.current.runSingleUpload();
        });

        expect(videoApi.finalize).toHaveBeenCalledTimes(1);
        expect(deps.addVideo).toHaveBeenCalledTimes(1);
        expect(deps.addPollingVuid).toHaveBeenCalledWith('v-new');
        expect(deps.closeUploadModal).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('does not navigate when finalize fails', async () => {
        vi.mocked(videoApi.finalize).mockResolvedValue(fail());
        const deps = makeDeps();
        const { result } = renderHook(() => useSingleUpload(deps), { wrapper: makeWrapper(makeStore()) });

        act(() => {
            result.current.handleTitleChange({ target: { value: 'My clip' } } as React.ChangeEvent<HTMLInputElement>);
            result.current.handleVideoFile(new File(['v'], 'v.mp4', { type: 'video/mp4' }));
        });

        await act(async () => {
            await result.current.runSingleUpload();
        });

        expect(deps.addVideo).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });
});
