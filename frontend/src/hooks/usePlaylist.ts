import { useAppDispatch, useAppSelector } from '@store';
import { playlistActions } from '@store/playlistSlice';
import { selectPlaylists } from '@store/playlistSelectors';
import { toastActions } from '@store/toastSlice';
import { playlist as playlistApi, toPuid, toVuid } from '@api';
import { useTranslation } from 'react-i18next';
import { ToastType } from '@enums/toastType';
import type { Playlist, PlaylistId, VideoId } from '@models';

export type { Playlist };

export function usePlaylist() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const playlists = useAppSelector(selectPlaylists);

    function showGenericError() {
        dispatch(toastActions.addToast({ message: t('errors.generic'), type: ToastType.ERROR }));
    }

    async function createPlaylist(name: string): Promise<PlaylistId | null> {
        const result = await playlistApi.create(name);

        if (!result.ok) {
            showGenericError();
            return null;
        }

        dispatch(playlistActions.createPlaylist({ id: result.data.id, name: result.data.name }));
        return result.data.id;
    }

    async function renamePlaylist(id: PlaylistId, name: string): Promise<void> {
        dispatch(playlistActions.renamePlaylist({ id, name }));
        const result = await playlistApi.update(toPuid(id), name);

        if (!result.ok) {
            showGenericError();
        }
    }

    async function deletePlaylist(id: PlaylistId): Promise<void> {
        dispatch(playlistActions.deletePlaylist(id));
        const result = await playlistApi.delete(toPuid(id));

        if (!result.ok) {
            showGenericError();
        }
    }

    async function addVideoToPlaylist(playlistId: PlaylistId, videoId: VideoId): Promise<void> {
        dispatch(playlistActions.addVideoToPlaylist({ playlistId, videoId }));
        const result = await playlistApi.addVideo(toPuid(playlistId), toVuid(videoId));

        if (!result.ok) {
            showGenericError();
        }
    }

    async function removeVideoFromPlaylist(playlistId: PlaylistId, videoId: VideoId): Promise<void> {
        dispatch(playlistActions.removeVideoFromPlaylist({ playlistId, videoId }));
        const result = await playlistApi.removeVideo(toPuid(playlistId), toVuid(videoId));

        if (!result.ok) {
            showGenericError();
        }
    }

    async function reorderVideosInPlaylist(playlistId: PlaylistId, videoIds: VideoId[]): Promise<void> {
        dispatch(playlistActions.reorderVideosInPlaylist({ playlistId, videoIds }));
        const result = await playlistApi.reorder(toPuid(playlistId), videoIds.map(toVuid));

        if (!result.ok) {
            showGenericError();
        }
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
