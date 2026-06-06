import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store';
import { selectWatchLaterIds } from '@store/playlistSelectors';
import { toastActions } from '@store/toastSlice';
import { usePlaylist } from '@hooks';
import { useBurstAnimation } from '@hooks';
import { domain } from '@domain';
import { ToastType } from '@enums/toastType';
import type { VideoId } from '@models';

interface UseVideoSaveResult {
    isSaved: boolean
    handleSave: () => void
}

export function useVideoSave(videoId: VideoId | undefined): UseVideoSaveResult {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { playlists, addVideoToPlaylist, removeVideoFromPlaylist } = usePlaylist();
    const watchLaterIds = useAppSelector(selectWatchLaterIds);
    const [, triggerSaveAnimation] = useBurstAnimation();

    const isSaved = videoId !== undefined && watchLaterIds.has(videoId);

    function handleSave() {
        const watchLater = playlists.find(p => domain.playlist.isWatchLater(p));

        if (watchLater === undefined || videoId === undefined) {
            return;
        }

        const isCurrentlySaved = watchLaterIds.has(videoId);
        const undo = isCurrentlySaved
            ? () => addVideoToPlaylist(watchLater.id, videoId)
            : () => removeVideoFromPlaylist(watchLater.id, videoId);

        dispatch(toastActions.addToast({
            message: t(isCurrentlySaved ? 'toast.unsaved' : 'toast.saved'),
            type: ToastType.SUCCESS,
            action: { label: t('common.undo'), onClick: undo },
        }));

        if (isCurrentlySaved) {
            removeVideoFromPlaylist(watchLater.id, videoId);
        } else {
            addVideoToPlaylist(watchLater.id, videoId);
        }

        triggerSaveAnimation();
    }

    return { isSaved, handleSave };
}
