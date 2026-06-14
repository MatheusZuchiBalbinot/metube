import { useCallback } from 'react';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { video as videoApi, toVuid } from '@api';
import type { Video, VideoId } from '@models';

/**
 * Stable action creators for the `video` slice. References are memoized on
 * `dispatch`, so they are safe in `React.memo`'d children and effect deps.
 */
export function useVideoActions() {
    const dispatch = useAppDispatch();

    const addVideo = useCallback(
        (v: Video) => dispatch(videoActions.addVideo(v)),
        [dispatch],
    );
    const editVideo = useCallback(
        (id: VideoId, partial: Partial<Video>) => dispatch(videoActions.editVideo({ id, partial })),
        [dispatch],
    );
    const deleteVideo = useCallback(
        (id: VideoId) => dispatch(videoActions.deleteVideo(id)),
        [dispatch],
    );
    const likeVideo = useCallback((id: VideoId) => {
        dispatch(videoActions.likeVideo(id));
        videoApi.toggleLike(toVuid(id)).catch(() => {
            dispatch(videoActions.likeVideo(id));
        });
    }, [dispatch]);
    const dislikeVideo = useCallback((id: VideoId) => {
        dispatch(videoActions.dislikeVideo(id));
        videoApi.toggleDislike(toVuid(id)).catch(() => {
            dispatch(videoActions.dislikeVideo(id));
        });
    }, [dispatch]);
    const watchVideo = useCallback(
        (videoId: VideoId) => dispatch(videoActions.watchVideo(videoId)),
        [dispatch],
    );
    const removeFromHistory = useCallback(
        (videoId: VideoId) => dispatch(videoActions.removeFromHistory(videoId)),
        [dispatch],
    );
    const clearHistory = useCallback(
        () => dispatch(videoActions.clearHistory()),
        [dispatch],
    );
    const updateProgress = useCallback(
        (videoId: VideoId, percent: number) => dispatch(videoActions.updateProgress({ videoId, percent })),
        [dispatch],
    );

    return {
        addVideo,
        editVideo,
        deleteVideo,
        likeVideo,
        dislikeVideo,
        watchVideo,
        removeFromHistory,
        clearHistory,
        updateProgress,
    };
}
