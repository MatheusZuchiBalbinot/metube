import { useCallback } from 'react';
import { shallowEqual } from 'react-redux';
import { useAppDispatch, useAppSelector } from '@store';
import {
    videoActions,
    selectHistoryTags,
    selectPublishedVideos,
    selectLikedSet,
    selectDislikedSet,
    selectSavedSet,
    selectRecommendations,
} from '@store/videoSlice';
import type { Video, VideoId } from '@models/video';
import type { Tag } from '@models/tag';
import type { TagView, MiniPlayerState, WatchEvent } from '@store/videoSlice';

export type { TagView, MiniPlayerState, WatchEvent };

export function useVideo() {
    const dispatch = useAppDispatch();

    // Granular selectors — each re-renders only when its specific value changes
    const videos = useAppSelector(s => s.video.videos);
    const watchHistory = useAppSelector(s => s.video.watchHistory);
    const watchEvents = useAppSelector(s => s.video.watchEvents);
    const pinnedVideoId = useAppSelector(s => s.video.pinnedVideoId);
    const videoProgress = useAppSelector(s => s.video.videoProgress, shallowEqual);
    const autoplay = useAppSelector(s => s.video.autoplay);
    const uploadModalOpen = useAppSelector(s => s.video.uploadModalOpen);
    const activeTagView = useAppSelector(s => s.video.activeTagView, shallowEqual);
    const miniPlayer = useAppSelector(s => s.video.miniPlayer, shallowEqual);
    const pendingVideoSeek = useAppSelector(s => s.video.pendingVideoSeek, shallowEqual);
    const shortsMuted = useAppSelector(s => s.video.shortsMuted);
    const shortsVolume = useAppSelector(s => s.video.shortsVolume);

    const historyTags = useAppSelector(selectHistoryTags);
    const publishedVideos = useAppSelector(selectPublishedVideos);
    const likedVideos = useAppSelector(selectLikedSet);
    const dislikedVideos = useAppSelector(selectDislikedSet);
    const savedVideos = useAppSelector(selectSavedSet);

    const recommendations = useAppSelector(selectRecommendations);

    // Stable function references — safe to use in React.memo'd children and useEffect deps
    const addVideo = useCallback(
        (video: Omit<Video, 'id' | 'views'>) => dispatch(videoActions.addVideo(video)),
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
    const likeVideo = useCallback(
        (id: VideoId) => dispatch(videoActions.likeVideo(id)),
        [dispatch],
    );
    const dislikeVideo = useCallback(
        (id: VideoId) => dispatch(videoActions.dislikeVideo(id)),
        [dispatch],
    );
    const saveVideo = useCallback(
        (id: VideoId) => dispatch(videoActions.saveVideo(id)),
        [dispatch],
    );
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
        () => dispatch(videoActions.openUploadModal()),
        [dispatch],
    );
    const closeUploadModal = useCallback(
        () => dispatch(videoActions.closeUploadModal()),
        [dispatch],
    );
    const openTagView = useCallback(
        (tag: Tag, fromVideoId: VideoId | null) => dispatch(videoActions.openTagView({ tag, fromVideoId })),
        [dispatch],
    );
    const closeTagView = useCallback(
        () => dispatch(videoActions.closeTagView()),
        [dispatch],
    );
    const openMiniPlayer = useCallback(
        (s: Omit<MiniPlayerState, 'seekSession'>) => dispatch(videoActions.openMiniPlayer(s)),
        [dispatch],
    );
    const closeMiniPlayer = useCallback(
        () => dispatch(videoActions.closeMiniPlayer()),
        [dispatch],
    );
    const setPendingVideoSeek = useCallback(
        (videoId: VideoId, time: number) => dispatch(videoActions.setPendingVideoSeek({ videoId, time })),
        [dispatch],
    );
    const consumePendingVideoSeek = useCallback((videoId: VideoId): number | null => {
        const isMatchingVideo = pendingVideoSeek?.videoId === videoId;
        if (!isMatchingVideo) {
            return null;
        }
        dispatch(videoActions.clearPendingVideoSeek());
        return pendingVideoSeek!.time;
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
        watchEvents,
        pinnedVideoId,
        likedVideos,
        dislikedVideos,
        savedVideos,
        videoProgress,
        autoplay,
        uploadModalOpen,
        activeTagView,
        miniPlayer,
        pendingVideoSeek,
        historyTags,
        publishedVideos,
        recommendations,
        shortsMuted,
        shortsVolume,

        addVideo,
        editVideo,
        deleteVideo,
        likeVideo,
        dislikeVideo,
        saveVideo,
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
