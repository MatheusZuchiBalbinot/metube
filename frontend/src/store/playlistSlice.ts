import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@utils/storageKeys';
import { loadFromStorage, isArray } from '@utils/loadFromStorage';
import { MOCK_PLAYLISTS } from '@data/mockPlaylists';
import type { Playlist, PlaylistId } from '@models/playlist';
import type { VideoId } from '@models/video';
import { videoActions } from './videoSlice';

export type { Playlist, PlaylistId };

interface PlaylistState {
    playlists: Playlist[]
    loading: boolean
    error: string | null
}

const playlistSlice = createSlice({
    name: 'playlist',
    initialState: (): PlaylistState => ({
        playlists: loadFromStorage<Playlist[]>(STORAGE_KEYS.PLAYLISTS, MOCK_PLAYLISTS, isArray),
        loading: false,
        error: null,
    }),
    reducers: {
        createPlaylist(state, action: PayloadAction<{ id: PlaylistId; name: string }>) {
            const { id, name } = action.payload;
            state.playlists.push({ id, name, videoIds: [], createdAt: new Date().toISOString() });
        },
        renamePlaylist(state, action: PayloadAction<{ id: PlaylistId; name: string }>) {
            const { id, name } = action.payload;
            const playlist = state.playlists.find(p => p.id === id);
            const isFound = playlist !== undefined;
            if (!isFound) { return; }
            playlist.name = name;
        },
        deletePlaylist(state, action: PayloadAction<PlaylistId>) {
            const id = action.payload;
            const index = state.playlists.findIndex(p => p.id === id);
            const isFound = index !== -1;
            if (!isFound) { return; }
            state.playlists.splice(index, 1);
        },
        addVideoToPlaylist(state, action: PayloadAction<{ playlistId: PlaylistId; videoId: VideoId }>) {
            const { playlistId, videoId } = action.payload;
            const playlist = state.playlists.find(p => p.id === playlistId);
            const isFound = playlist !== undefined;
            if (!isFound) { return; }
            const isAlreadyIn = playlist.videoIds.includes(videoId);
            if (isAlreadyIn) { return; }
            playlist.videoIds.push(videoId);
        },
        removeVideoFromPlaylist(state, action: PayloadAction<{ playlistId: PlaylistId; videoId: VideoId }>) {
            const { playlistId, videoId } = action.payload;
            const playlist = state.playlists.find(p => p.id === playlistId);
            const isFound = playlist !== undefined;
            if (!isFound) { return; }
            playlist.videoIds = playlist.videoIds.filter(id => id !== videoId);
        },
        reorderVideosInPlaylist(state, action: PayloadAction<{ playlistId: PlaylistId; videoIds: VideoId[] }>) {
            const { playlistId, videoIds } = action.payload;
            const playlist = state.playlists.find(p => p.id === playlistId);
            const isFound = playlist !== undefined;
            if (!isFound) { return; }
            playlist.videoIds = videoIds;
        },

        // Cross-tab sync — name starts with 'playlist/xTab', excluded from persist listener
        xTabSetPlaylists(state, action: PayloadAction<Playlist[]>) {
            state.playlists = action.payload;
        },
    },
    extraReducers: builder => {
        builder.addCase(videoActions.deleteVideo, (state, action) => {
            const deletedId = action.payload;
            for (const playlist of state.playlists) {
                playlist.videoIds = playlist.videoIds.filter(id => id !== deletedId);
            }
        });
    },
});

export const playlistActions = playlistSlice.actions;
export default playlistSlice;
