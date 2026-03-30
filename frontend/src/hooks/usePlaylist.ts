import { useAppDispatch, useAppSelector } from '@store';
import { playlistActions } from '@store/playlistSlice';
import type { Playlist } from '@data/mockPlaylists';
import type { PlaylistId } from '@models/playlist';
import type { VideoId } from '@models/video';

export type { Playlist };

export function usePlaylist() {
    const dispatch = useAppDispatch();
    const playlists = useAppSelector(s => s.playlist.playlists);

    function createPlaylist(id: string, name: string) {
        dispatch(playlistActions.createPlaylist({ id: id as unknown as PlaylistId, name }));
    }

    function renamePlaylist(id: string, name: string) {
        dispatch(playlistActions.renamePlaylist({ id: id as unknown as PlaylistId, name }));
    }

    function deletePlaylist(id: string) {
        dispatch(playlistActions.deletePlaylist(id as unknown as PlaylistId));
    }

    function addVideoToPlaylist(playlistId: string, videoId: string) {
        dispatch(playlistActions.addVideoToPlaylist({ playlistId: playlistId as unknown as PlaylistId, videoId: videoId as unknown as VideoId }));
    }

    function removeVideoFromPlaylist(playlistId: string, videoId: string) {
        dispatch(playlistActions.removeVideoFromPlaylist({ playlistId: playlistId as unknown as PlaylistId, videoId: videoId as unknown as VideoId }));
    }

    function reorderVideosInPlaylist(playlistId: string, videoIds: string[]) {
        dispatch(playlistActions.reorderVideosInPlaylist({ playlistId: playlistId as unknown as PlaylistId, videoIds: videoIds as unknown as VideoId[] }));
    }

    function getVideoPlaylistIds(videoId: string): string[] {
        return playlists.filter((p: Playlist) => p.videoIds?.includes(videoId as unknown as VideoId)).map((p: Playlist) => p.id as string);
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
