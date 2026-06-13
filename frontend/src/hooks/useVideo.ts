import { useCallback } from 'react';
import { shallowEqual } from 'react-redux';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions } from '@store/videoSlice';
import { videoUiActions } from '@store/videoUiSlice';
import {
    selectAllVideos,
    selectHistoryTags,
    selectPublishedVideos,
    selectLikedSet,
    selectDislikedSet,
    selectRecommendations,
    selectRecommendationsLoading,
} from '@store/videoSelectors';
import { video as videoApi, toVuid } from '@api';
import type { TagView, MiniPlayerState } from '@store/videoUiSlice';
import type { Video, VideoId, Tag } from '@models';

export type { TagView, MiniPlayerState };

export function useVideo() {
    const dispatch = useAppDispatch();

    // Granular selectors — each re-renders only when its specific value changes
    const videos = useAppSelector(selectAllVideos);
    const watchHistory = useAppSelector(s => s.video.watchHistory);
    const pinnedVideoId = useAppSelector(s => s.video.pinnedVideoId);
    const videoProgress = useAppSelector(s => s.video.videoProgress, shallowEqual);
    const autoplay = useAppSelector(s => s.video.autoplay);
    const uploadModalOpen = useAppSelector(s => s.videoUi.uploadModalOpen);
    const activeTagView = useAppSelector(s => s.videoUi.activeTagView, shallowEqual);
    const miniPlayer = useAppSelector(s => s.videoUi.miniPlayer, shallowEqual);
    const pendingVideoSeek = useAppSelector(s => s.videoUi.pendingVideoSeek, shallowEqual);
    const shortsMuted = useAppSelector(s => s.video.shortsMuted);
    const shortsVolume = useAppSelector(s => s.video.shortsVolume);

    const historyTags = useAppSelector(selectHistoryTags);
    const publishedVideos = useAppSelector(selectPublishedVideos);
    const likedVideos = useAppSelector(selectLikedSet);
    const dislikedVideos = useAppSelector(selectDislikedSet);

    const recommendations = useAppSelector(selectRecommendations);
    const recommendationsLoading = useAppSelector(selectRecommendationsLoading);

    // Stable function references — safe to use in React.memo'd children and useEffect deps
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
    const setAutoplay = useCallback(
        (value: boolean) => dispatch(videoActions.setAutoplay(value)),
        [dispatch],
    );
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
    const pinVideo = useCallback(
        (id: VideoId) => dispatch(videoActions.pinVideo(id)),
        [dispatch],
    );
    const unpinVideo = useCallback(
        () => dispatch(videoActions.unpinVideo()),
        [dispatch],
    );
    const setShortsMuted = useCallback(
        (muted: boolean) => dispatch(videoActions.setShortsMuted(muted)),
        [dispatch],
    );
    const setShortsVolume = useCallback(
        (volume: number) => dispatch(videoActions.setShortsVolume(volume)),
        [dispatch],
    );

    return {
        videos,
        watchHistory,
        pinnedVideoId,
        likedVideos,
        dislikedVideos,
        videoProgress,
        autoplay,
        uploadModalOpen,
        activeTagView,
        miniPlayer,
        pendingVideoSeek,
        historyTags,
        publishedVideos,
        recommendations,
        recommendationsLoading,
        shortsMuted,
        shortsVolume,

        addVideo,
        editVideo,
        deleteVideo,
        likeVideo,
        dislikeVideo,
        watchVideo,
        removeFromHistory,
        clearHistory,
        updateProgress,
        setAutoplay,
        openUploadModal,
        closeUploadModal,
        openTagView,
        closeTagView,
        openMiniPlayer,
        closeMiniPlayer,
        setPendingVideoSeek,
        consumePendingVideoSeek,
        pinVideo,
        unpinVideo,
        setShortsMuted,
        setShortsVolume,
    };
}
