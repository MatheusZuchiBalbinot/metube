// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usePlaylistCard } from '@components/playlist/usePlaylistCard';
import playlistSlice from '@store/playlistSlice';
import toastSlice from '@store/toastSlice';
import type { Playlist, PlaylistId } from '@models';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@api/playlists', () => ({
    playlist: {
        update: vi.fn().mockResolvedValue({ ok: true, data: null }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        reorder: vi.fn().mockResolvedValue({ ok: true, data: null }),
    },
    toPuid: (id: string) => id,
    toVuid: (id: string) => id,
}));

import { playlist as playlistApi } from '@api/playlists';

const pid = (s: string) => s as unknown as PlaylistId;

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
    return {
        id: pid('pl-1'),
        name: 'My Playlist',
        videoIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

function makeStore(playlist: Playlist) {
    return configureStore({
        reducer: { playlist: playlistSlice.reducer, toast: toastSlice.reducer },
        preloadedState: { playlist: { playlists: [playlist] } },
    });
}

function renderCardHook(playlist: Playlist, defaultExpanded = false) {
    const store = makeStore(playlist);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(Provider, { store }, children);
    const view = renderHook(() => usePlaylistCard(playlist, defaultExpanded), { wrapper });
    return { ...view, store };
}

describe('usePlaylistCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('toggles expanded state', () => {
        const { result } = renderCardHook(makePlaylist());

        expect(result.current.expanded).toBe(false);

        act(() => {
            result.current.handleToggleExpand();
        });

        expect(result.current.expanded).toBe(true);
    });

    it('honours defaultExpanded', () => {
        const { result } = renderCardHook(makePlaylist(), true);

        expect(result.current.expanded).toBe(true);
    });

    it('renames the playlist on confirm', async () => {
        const playlist = makePlaylist();
        const { result, store } = renderCardHook(playlist);

        act(() => {
            result.current.handleRenameStart({ stopPropagation() {} } as React.MouseEvent);
        });
        act(() => {
            result.current.handleRenameNameChange({ target: { value: 'Renamed' } } as React.ChangeEvent<HTMLInputElement>);
        });
        await act(async () => {
            result.current.handleRenameConfirm({ stopPropagation() {} } as React.SyntheticEvent);
        });

        expect(result.current.renaming).toBe(false);
        expect(store.getState().playlist.playlists[0].name).toBe('Renamed');
        expect(playlistApi.update).toHaveBeenCalledWith('pl-1', 'Renamed');
    });

    it('ignores an empty rename', async () => {
        const { result, store } = renderCardHook(makePlaylist());

        act(() => {
            result.current.handleRenameStart({ stopPropagation() {} } as React.MouseEvent);
        });
        act(() => {
            result.current.handleRenameNameChange({ target: { value: '   ' } } as React.ChangeEvent<HTMLInputElement>);
        });
        await act(async () => {
            result.current.handleRenameConfirm({ stopPropagation() {} } as React.SyntheticEvent);
        });

        expect(result.current.renaming).toBe(true);
        expect(store.getState().playlist.playlists[0].name).toBe('My Playlist');
        expect(playlistApi.update).not.toHaveBeenCalled();
    });

    it('resets the draft name on cancel', () => {
        const { result } = renderCardHook(makePlaylist());

        act(() => {
            result.current.handleRenameStart({ stopPropagation() {} } as React.MouseEvent);
        });
        act(() => {
            result.current.handleRenameNameChange({ target: { value: 'Half-typed' } } as React.ChangeEvent<HTMLInputElement>);
        });
        act(() => {
            result.current.handleRenameCancel({ stopPropagation() {} } as React.SyntheticEvent);
        });

        expect(result.current.renaming).toBe(false);
        expect(result.current.renameName).toBe('My Playlist');
    });

    it('deletes the playlist on confirm', async () => {
        const { result, store } = renderCardHook(makePlaylist());

        act(() => {
            result.current.handleDeleteRequest({ stopPropagation() {} } as React.MouseEvent);
        });
        expect(result.current.deleteConfirmOpen).toBe(true);

        await act(async () => {
            result.current.handleDeleteConfirm();
        });

        expect(result.current.deleteConfirmOpen).toBe(false);
        expect(store.getState().playlist.playlists).toHaveLength(0);
        expect(playlistApi.delete).toHaveBeenCalledWith('pl-1');
    });

    it('reorders the video ids', async () => {
        const playlist = makePlaylist({ videoIds: ['a', 'b'] as unknown as Playlist['videoIds'] });
        const { result, store } = renderCardHook(playlist);

        await act(async () => {
            result.current.handleReorder(['b', 'a']);
        });

        expect(store.getState().playlist.playlists[0].videoIds).toEqual(['b', 'a']);
        expect(playlistApi.reorder).toHaveBeenCalledWith('pl-1', ['b', 'a']);
    });
});
