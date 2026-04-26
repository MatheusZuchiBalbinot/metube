import { useAppDispatch, useAppSelector } from '@store';
import { playlistActions } from '@store/playlistSlice';
import { toastActions } from '@store/toastSlice';
import { playlist as playlistApi } from '@api/playlists';
import { useTranslation } from 'react-i18next';
import type { Playlist, PlaylistId } from '@models/playlist';
import type { VideoId } from '@models/video';
import type { Puid } from '@api/playlists';
import type { Vuid } from '@api/videos';

export type { Playlist };

export function usePlaylist() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const playlists = useAppSelector(s => s.playlist.playlists);

    async function createPlaylist(name: string): Promise<PlaylistId | null> {
        const result = await playlistApi.create(name);
        if (!result) {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: 'error' }));
            return null;
        }
        dispatch(playlistActions.createPlaylist({ id: result.id, name: result.name }));
        return result.id;
    }

    function renamePlaylist(id: string, name: string): void {
        dispatch(playlistActions.renamePlaylist({ id: id as unknown as PlaylistId, name }));
        playlistApi.update(id as unknown as Puid, name).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: 'error' }));
        });
    }

    function deletePlaylist(id: string): void {
        dispatch(playlistActions.deletePlaylist(id as unknown as PlaylistId));
        playlistApi.delete(id as unknown as Puid).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: 'error' }));
        });
    }

    function addVideoToPlaylist(playlistId: string, videoId: string): void {
        dispatch(playlistActions.addVideoToPlaylist({
            playlistId: playlistId as unknown as PlaylistId,
            videoId: videoId as unknown as VideoId,
        }));
        playlistApi.addVideo(playlistId as unknown as Puid, videoId as unknown as Vuid).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: 'error' }));
        });
    }

    function removeVideoFromPlaylist(playlistId: string, videoId: string): void {
        dispatch(playlistActions.removeVideoFromPlaylist({
            playlistId: playlistId as unknown as PlaylistId,
            videoId: videoId as unknown as VideoId,
        }));
        playlistApi.removeVideo(playlistId as unknown as Puid, videoId as unknown as Vuid).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: 'error' }));
        });
    }

    function reorderVideosInPlaylist(playlistId: string, videoIds: string[]): void {
        dispatch(playlistActions.reorderVideosInPlaylist({
            playlistId: playlistId as unknown as PlaylistId,
            videoIds: videoIds as unknown as VideoId[],
        }));
        playlistApi.reorder(playlistId as unknown as Puid, videoIds as unknown as Vuid[]).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: 'error' }));
        });
    }

    function getVideoPlaylistIds(videoId: string): string[] {
        return playlists
            .filter((p: Playlist) => p.videoIds?.includes(videoId as unknown as VideoId))
            .map((p: Playlist) => p.id as string);
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
