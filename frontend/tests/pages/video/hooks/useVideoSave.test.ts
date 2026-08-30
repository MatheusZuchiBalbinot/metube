// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useVideoSave } from '@pages/video/hooks/useVideoSave';
import playlistSlice from '@store/playlistSlice';
import toastSlice from '@store/toastSlice';
import { selectToasts } from '@store/toastSelectors';
import { vid } from '../../../helpers/factories';
import type { Playlist, PlaylistId } from '@models/playlist';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@api/playlists', () => ({
    playlist: {
        addVideo: vi.fn().mockResolvedValue({ ok: true, data: null }),
        removeVideo: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    },
    toPuid: (id: string) => id,
    toVuid: (id: string) => id,
}));

const pid = (s: string) => s as unknown as PlaylistId;

function makeWatchLater(videoIds: ReturnType<typeof vid>[] = []): Playlist {
    return { id: pid('wl'), name: 'Watch Later', videoIds, createdAt: '2024-01-01T00:00:00Z' };
}

function makeStore(playlists: Playlist[]) {
    return configureStore({
        reducer: { playlist: playlistSlice.reducer, toast: toastSlice.reducer },
        preloadedState: { playlist: { playlists } },
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

describe('useVideoSave', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('isSaved reflects whether the video is in the Watch Later playlist', () => {
        const store = makeStore([makeWatchLater([vid('v1')])]);
        const { result } = renderHook(() => useVideoSave(vid('v1')), { wrapper: wrapper(store) });

        expect(result.current.isSaved).toBe(true);
    });

    it('isSaved is false when videoId is undefined', () => {
        const store = makeStore([makeWatchLater([vid('v1')])]);
        const { result } = renderHook(() => useVideoSave(undefined), { wrapper: wrapper(store) });

        expect(result.current.isSaved).toBe(false);
    });

    it('handleSave adds the video to Watch Later when not saved yet', () => {
        const store = makeStore([makeWatchLater([])]);
        const { result } = renderHook(() => useVideoSave(vid('v1')), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleSave();
        });

        expect(store.getState().playlist.playlists[0].videoIds).toContain(vid('v1'));
    });

    it('handleSave removes the video from Watch Later when already saved', () => {
        const store = makeStore([makeWatchLater([vid('v1')])]);
        const { result } = renderHook(() => useVideoSave(vid('v1')), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleSave();
        });

        expect(store.getState().playlist.playlists[0].videoIds).not.toContain(vid('v1'));
    });

    it('handleSave shows an undoable toast', () => {
        const store = makeStore([makeWatchLater([])]);
        const { result } = renderHook(() => useVideoSave(vid('v1')), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleSave();
        });

        const toasts = selectToasts(store.getState());
        expect(toasts).toHaveLength(1);
        expect(toasts[0].action).toBeDefined();
    });

    it('handleSave is a no-op when there is no Watch Later playlist', () => {
        const store = makeStore([]);
        const { result } = renderHook(() => useVideoSave(vid('v1')), { wrapper: wrapper(store) });

        act(() => {
            result.current.handleSave();
        });

        expect(selectToasts(store.getState())).toHaveLength(0);
    });
});
