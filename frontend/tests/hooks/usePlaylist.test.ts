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
        update: vi.fn().mockResolvedValue({ ok: true, data: null }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        addVideo: vi.fn().mockResolvedValue({ ok: true, data: null }),
        removeVideo: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        reorder: vi.fn().mockResolvedValue({ ok: true, data: null }),
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    },
    toPuid: (id: string) => id,
}));

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = () => ({ ok: false as const, error: 'fail' });

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
            vi.mocked(playlistApi.create).mockResolvedValue(ok(created));
            const store = makeStore();
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            await act(async () => {
                await result.current.createPlaylist('New');
            });

            expect(playlistApi.create).toHaveBeenCalledWith('New');
            expect(result.current.playlists.some(p => p.id === pid('pl-new'))).toBe(true);
        });

        it('returns null and does not add when API fails', async () => {
            vi.mocked(playlistApi.create).mockResolvedValue(fail());
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

    describe('error toasts', () => {
        it('createPlaylist shows a toast and returns null when API fails', async () => {
            vi.mocked(playlistApi.create).mockResolvedValue(fail());
            const store = makeStore();
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            let returned: unknown;
            await act(async () => {
                returned = await result.current.createPlaylist('Nope');
            });

            expect(returned).toBeNull();
            expect(store.getState().toast.toasts.length).toBe(1);
        });

        it('renamePlaylist shows a toast when API fails', async () => {
            vi.mocked(playlistApi.update).mockResolvedValue(fail());
            const pl = makePlaylist({ id: pid('pl-r') });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            await act(async () => {
                await result.current.renamePlaylist(pid('pl-r'), 'New');
            });

            expect(store.getState().toast.toasts.length).toBe(1);
        });

        it('deletePlaylist shows a toast when API fails', async () => {
            vi.mocked(playlistApi.delete).mockResolvedValue(fail());
            const pl = makePlaylist({ id: pid('pl-d') });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            await act(async () => {
                await result.current.deletePlaylist(pid('pl-d'));
            });

            expect(store.getState().toast.toasts.length).toBe(1);
        });

        it('addVideoToPlaylist shows a toast when API fails', async () => {
            vi.mocked(playlistApi.addVideo).mockResolvedValue(fail());
            const pl = makePlaylist({ id: pid('pl-av') });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            await act(async () => {
                await result.current.addVideoToPlaylist(pid('pl-av'), vid('v-x'));
            });

            expect(store.getState().toast.toasts.length).toBe(1);
        });

        it('removeVideoFromPlaylist shows a toast when API fails', async () => {
            vi.mocked(playlistApi.removeVideo).mockResolvedValue(fail());
            const pl = makePlaylist({ id: pid('pl-rv'), videoIds: [vid('v-x')] });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            await act(async () => {
                await result.current.removeVideoFromPlaylist(pid('pl-rv'), vid('v-x'));
            });

            expect(store.getState().toast.toasts.length).toBe(1);
        });

        it('reorderVideosInPlaylist shows a toast when API fails', async () => {
            vi.mocked(playlistApi.reorder).mockResolvedValue(fail());
            const pl = makePlaylist({ id: pid('pl-ord'), videoIds: [vid('v-a'), vid('v-b')] });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            await act(async () => {
                await result.current.reorderVideosInPlaylist(pid('pl-ord'), [vid('v-b'), vid('v-a')]);
            });

            expect(store.getState().toast.toasts.length).toBe(1);
        });
    });

    describe('reorderVideosInPlaylist (success)', () => {
        it('reorders videoIds optimistically', async () => {
            vi.mocked(playlistApi.reorder).mockResolvedValue(ok(null));
            const pl = makePlaylist({ id: pid('pl-ok'), videoIds: [vid('v-a'), vid('v-b')] });
            const store = makeStore([pl]);
            const { result } = renderHook(() => usePlaylist(), { wrapper: wrapper(store) });

            await act(async () => {
                await result.current.reorderVideosInPlaylist(pid('pl-ok'), [vid('v-b'), vid('v-a')]);
            });

            const updated = result.current.playlists.find(p => p.id === pid('pl-ok'));
            expect(updated?.videoIds?.[0]).toBe('v-b');
        });
    });
});
