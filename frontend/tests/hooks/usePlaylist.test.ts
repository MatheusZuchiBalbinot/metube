// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { usePlaylist } from '@hooks/usePlaylist';
import playlistSlice from '@store/playlistSlice';
import toastSlice from '@store/toastSlice';
import type { Playlist, PlaylistId } from '@models/playlist';
import type { VideoId } from '@models/video';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@api/playlists', () => ({
    playlist: {
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(null),
        addVideo: vi.fn().mockResolvedValue(null),
        removeVideo: vi.fn().mockResolvedValue(null),
        reorder: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue(null),
    },
}));

import { playlist as playlistApi } from '@api/playlists';

const pid = (s: string) => s as unknown as PlaylistId;
const vid = (s: string) => s as unknown as VideoId;

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
    return {
        id: pid('pl-1'),
        name: 'Test Playlist',
        videoIds: [],
        ...overrides,
    };
}

function makeStore(playlists: Playlist[] = []) {
    return configureStore({
        reducer: {
            playlist: playlistSlice.reducer,
            toast: toastSlice.reducer,
        },
        preloadedState: { playlist: { playlists } },
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
            Provider,
            { store },
            React.createElement(MemoryRouter, null, children),
        );
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('usePlaylist', () => {
    describe('createPlaylist', () => {
        it('calls playlistApi.create and adds to store on success', async () => {
            const created = makePlaylist({ id: pid('pl-new'), name: 'New' });
            vi.mocked(playlistApi.create).mockResolvedValue(created);
            const store = makeStore();
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            await act(async () => {
                await result.current.createPlaylist('New');
            });

            expect(playlistApi.create).toHaveBeenCalledWith('New');
            expect(result.current.playlists.some(p => p.id === pid('pl-new'))).toBe(true);
        });

        it('returns null and does not add when API fails', async () => {
            vi.mocked(playlistApi.create).mockResolvedValue(null);
            const store = makeStore();
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            let returnedId: unknown;

            await act(async () => {
                returnedId = await result.current.createPlaylist('Broken');
            });

            expect(returnedId).toBeNull();
            expect(result.current.playlists).toHaveLength(0);
        });
    });

    describe('renamePlaylist', () => {
        it('updates the playlist name in store optimistically', () => {
            const pl = makePlaylist({ id: pid('pl-rename'), name: 'Old Name' });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            act(() => {
                result.current.renamePlaylist('pl-rename', 'New Name');
            });

            const updated = result.current.playlists.find(p => p.id === pid('pl-rename'));
            expect(updated?.name).toBe('New Name');
            expect(playlistApi.update).toHaveBeenCalled();
        });
    });

    describe('deletePlaylist', () => {
        it('removes playlist from store', () => {
            const pl = makePlaylist({ id: pid('pl-del') });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            act(() => {
                result.current.deletePlaylist('pl-del');
            });

            expect(result.current.playlists.some(p => p.id === pid('pl-del'))).toBe(false);
        });
    });

    describe('addVideoToPlaylist', () => {
        it('adds videoId to playlist.videoIds optimistically', () => {
            const pl = makePlaylist({ id: pid('pl-add'), videoIds: [] });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            act(() => {
                result.current.addVideoToPlaylist('pl-add', 'v-xyz');
            });

            const updated = result.current.playlists.find(p => p.id === pid('pl-add'));
            expect(updated?.videoIds).toContain('v-xyz');
        });
    });

    describe('removeVideoFromPlaylist', () => {
        it('removes videoId from playlist.videoIds optimistically', () => {
            const pl = makePlaylist({ id: pid('pl-rem'), videoIds: [vid('v-xyz')] });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            act(() => {
                result.current.removeVideoFromPlaylist('pl-rem', 'v-xyz');
            });

            const updated = result.current.playlists.find(p => p.id === pid('pl-rem'));
            expect(updated?.videoIds).not.toContain('v-xyz');
        });
    });

    describe('getVideoPlaylistIds', () => {
        it('returns ids of playlists containing the videoId', () => {
            const pl1 = makePlaylist({ id: pid('pl-a'), videoIds: [vid('v-1')] });
            const pl2 = makePlaylist({ id: pid('pl-b'), videoIds: [] });
            const store = makeStore([pl1, pl2]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            const ids = result.current.getVideoPlaylistIds('v-1');
            expect(ids).toContain('pl-a');
            expect(ids).not.toContain('pl-b');
        });
    });
});
