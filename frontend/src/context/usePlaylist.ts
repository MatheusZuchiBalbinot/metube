import { useAppDispatch, useAppSelector } from '@store';
import { playlistActions } from '@store/playlistSlice';
import type { Playlist } from '@data/mockPlaylists';

export type { Playlist };

export function usePlaylist() {
    const dispatch = useAppDispatch();
    const playlists = useAppSelector(s => s.playlist.playlists);

    function createPlaylist(id: string, name: string) {
        dispatch(playlistActions.createPlaylist({ id, name }));
    }

    function renamePlaylist(id: string, name: string) {
        dispatch(playlistActions.renamePlaylist({ id, name }));
    }

    function deletePlaylist(id: string) {
        dispatch(playlistActions.deletePlaylist(id));
    }

    function addVideoToPlaylist(playlistId: string, videoId: string) {
        dispatch(playlistActions.addVideoToPlaylist({ playlistId, videoId }));
    }

    function removeVideoFromPlaylist(playlistId: string, videoId: string) {
        dispatch(playlistActions.removeVideoFromPlaylist({ playlistId, videoId }));
    }

    function reorderVideosInPlaylist(playlistId: string, videoIds: string[]) {
        dispatch(playlistActions.reorderVideosInPlaylist({ playlistId, videoIds }));
    }

    function getVideoPlaylistIds(videoId: string): string[] {
        return playlists.filter(p => p.videoIds?.includes(videoId)).map(p => p.id);
    }

    return {
        playlists,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        addVideoToPlaylist,
        removeVideoFromPlaylist,
        reorderVideosInPlaylist,
        getVideoPlaylistIds,
    };
}
