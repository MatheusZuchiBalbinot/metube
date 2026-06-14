import { useCallback } from 'react';
import { shallowEqual } from 'react-redux';
import { useAppDispatch, useAppSelector } from '@store';
import { videoUiActions } from '@store/videoUiSlice';
import type { TagView, MiniPlayerState } from '@store/videoUiSlice';
import type { VideoId, Tag } from '@models';

export type { TagView, MiniPlayerState };

/**
 * Transient video UI state from the `videoUi` slice: upload modal, tag view,
 * mini player and the pending resume-seek, plus their stable setters.
 */
export function useVideoUi() {
    const dispatch = useAppDispatch();

    const uploadModalOpen = useAppSelector(s => s.videoUi.uploadModalOpen);
    const activeTagView = useAppSelector(s => s.videoUi.activeTagView, shallowEqual);
    const miniPlayer = useAppSelector(s => s.videoUi.miniPlayer, shallowEqual);
    const pendingVideoSeek = useAppSelector(s => s.videoUi.pendingVideoSeek, shallowEqual);

    const openUploadModal = useCallback(
        () => dispatch(videoUiActions.openUploadModal()),
        [dispatch],
    );
    const closeUploadModal = useCallback(
        () => dispatch(videoUiActions.closeUploadModal()),
        [dispatch],
    );
    const openTagView = useCallback(
        (tag: Tag, fromVideoId: VideoId | null) => dispatch(videoUiActions.openTagView({ tag, fromVideoId })),
        [dispatch],
    );
    const closeTagView = useCallback(
        () => dispatch(videoUiActions.closeTagView()),
        [dispatch],
    );
    const openMiniPlayer = useCallback(
        (s: Omit<MiniPlayerState, 'seekSession'>) => dispatch(videoUiActions.openMiniPlayer(s)),
        [dispatch],
    );
    const closeMiniPlayer = useCallback(
        () => dispatch(videoUiActions.closeMiniPlayer()),
        [dispatch],
    );
    const setPendingVideoSeek = useCallback(
        (videoId: VideoId, time: number) => dispatch(videoUiActions.setPendingVideoSeek({ videoId, time })),
        [dispatch],
    );
    const consumePendingVideoSeek = useCallback((videoId: VideoId): number | null => {
        if (pendingVideoSeek?.videoId !== videoId) {
            return null;
        }
        dispatch(videoUiActions.clearPendingVideoSeek());
        return pendingVideoSeek.time;
    }, [dispatch, pendingVideoSeek]);

    return {
        uploadModalOpen,
        activeTagView,
        miniPlayer,
        pendingVideoSeek,
        openUploadModal,
        closeUploadModal,
        openTagView,
        closeTagView,
        openMiniPlayer,
        closeMiniPlayer,
        setPendingVideoSeek,
        consumePendingVideoSeek,
    };
}
