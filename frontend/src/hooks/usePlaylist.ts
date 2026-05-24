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
import { ToastType } from '@enums/toastType';

export function usePlaylist() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const playlists = useAppSelector(s => s.playlist.playlists);

    async function createPlaylist(name: string): Promise<PlaylistId | null> {
        const result = await playlistApi.create(name);
        if (!result) {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: ToastType.ERROR }));
            return null;
        }
        dispatch(playlistActions.createPlaylist({ id: result.id, name: result.name }));
        return result.id;
    }

    function renamePlaylist(id: PlaylistId, name: string): void {
        dispatch(playlistActions.renamePlaylist({ id, name }));
        playlistApi.update(id as unknown as Puid, name).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: ToastType.ERROR }));
        });
    }

    function deletePlaylist(id: PlaylistId): void {
        dispatch(playlistActions.deletePlaylist(id));
        playlistApi.delete(id as unknown as Puid).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: ToastType.ERROR }));
        });
    }

    function addVideoToPlaylist(playlistId: PlaylistId, videoId: VideoId): void {
        dispatch(playlistActions.addVideoToPlaylist({ playlistId, videoId }));
        playlistApi.addVideo(playlistId as unknown as Puid, videoId as unknown as Vuid).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: ToastType.ERROR }));
        });
    }

    function removeVideoFromPlaylist(playlistId: PlaylistId, videoId: VideoId): void {
        dispatch(playlistActions.removeVideoFromPlaylist({ playlistId, videoId }));
        playlistApi.removeVideo(playlistId as unknown as Puid, videoId as unknown as Vuid).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: ToastType.ERROR }));
        });
    }

    function reorderVideosInPlaylist(playlistId: PlaylistId, videoIds: VideoId[]): void {
        dispatch(playlistActions.reorderVideosInPlaylist({ playlistId, videoIds }));
        playlistApi.reorder(playlistId as unknown as Puid, videoIds as unknown as Vuid[]).catch(() => {
            dispatch(toastActions.addToast({ message: t('errors.generic'), type: ToastType.ERROR }));
        });
    }

    function getVideoPlaylistIds(videoId: VideoId): PlaylistId[] {
        return playlists
            .filter((p: Playlist) => p.videoIds?.includes(videoId))
            .map((p: Playlist) => p.id);
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
