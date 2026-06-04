import { createSelector } from '@reduxjs/toolkit';
import { domain } from '@domain';
import type { RootState } from './types';
import type { VideoId } from '@models';

export const selectPlaylists = (state: RootState) => state.playlist.playlists;
export const selectPlaylistLoading = (state: RootState) => state.playlist.loading;
export const selectPlaylistError = (state: RootState) => state.playlist.error;

export const selectWatchLaterIds = createSelector(
    (state: RootState) => state.playlist.playlists,
    (playlists) => {
        const wl = playlists.find(p => domain.playlist.isWatchLater(p));
        return new Set<VideoId>(wl?.videoIds ?? []);
    },
);
