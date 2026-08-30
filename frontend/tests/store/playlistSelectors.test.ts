// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { playlistActions } from '@store/playlistSlice';
import { PLAYLIST_CONSTANTS } from '@models';
import { selectPlaylists, selectPlaylistLoading, selectPlaylistError, selectWatchLaterIds } from '@store/playlistSelectors';
import { vid } from '../helpers/factories';
import type { PlaylistId } from '@models';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

const plid = (s: string) => s as unknown as PlaylistId;

describe('playlistSelectors', () => {
    it('starts with no playlists, not loading, no error', () => {
        const store = makeStore();

        expect(selectPlaylists(store.getState())).toEqual([]);
        expect(selectPlaylistLoading(store.getState())).toBe(false);
        expect(selectPlaylistError(store.getState())).toBeNull();
    });

    it('selectWatchLaterIds returns an empty set when there is no Watch Later playlist', () => {
        const store = makeStore();
        store.dispatch(playlistActions.createPlaylist({ id: plid('p1'), name: 'My mix' }));

        expect(selectWatchLaterIds(store.getState()).size).toBe(0);
    });

    it('selectWatchLaterIds returns the Watch Later playlist videoIds as a Set', () => {
        const store = makeStore();
        store.dispatch(playlistActions.createPlaylist({ id: plid('wl'), name: PLAYLIST_CONSTANTS.WATCH_LATER }));
        store.dispatch(playlistActions.addVideoToPlaylist({ playlistId: plid('wl'), videoId: vid('v1') }));

        const ids = selectWatchLaterIds(store.getState());
        expect(ids.has(vid('v1'))).toBe(true);
        expect(ids.size).toBe(1);
    });
});
