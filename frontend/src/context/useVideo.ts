import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@store';
import {
    videoActions,
    selectHistoryTags,
    selectPublishedVideos,
    selectLikedSet,
    selectDislikedSet,
    selectSavedSet,
    makeSelectRecommendations,
} from '@store/videoSlice';
import type { Video } from '@data/mockVideos';
import type { TagView, MiniPlayerState, WatchEvent } from '@store/videoSlice';

export type { TagView, MiniPlayerState, WatchEvent };

export function useVideo() {
    const dispatch = useAppDispatch();
    const state = useAppSelector(s => s.video);
    const historyTags = useAppSelector(selectHistoryTags);
    const publishedVideos = useAppSelector(selectPublishedVideos);
    const likedVideos = useAppSelector(selectLikedSet);
    const dislikedVideos = useAppSelector(selectDislikedSet);
    const savedVideos = useAppSelector(selectSavedSet);

    const selectRecommendations = useMemo(() => makeSelectRecommendations(200), []);
    const recommendations = useAppSelector(selectRecommendations);

    function consumePendingVideoSeek(videoId: string): number | null {
        const pending = state.pendingVideoSeek;
        const isMatchingVideo = pending?.videoId === videoId;
        if (!isMatchingVideo) {
            return null;
        }
        dispatch(videoActions.clearPendingVideoSeek());
        return pending!.time;
    }

    return {
        videos: state.videos,
        watchHistory: state.watchHistory,
        watchEvents: state.watchEvents,
        pinnedVideoId: state.pinnedVideoId,
        likedVideos,
        dislikedVideos,
        savedVideos,
        videoProgress: state.videoProgress,
        autoplay: state.autoplay,
        uploadModalOpen: state.uploadModalOpen,
        activeTagView: state.activeTagView,
        miniPlayer: state.miniPlayer,
        pendingVideoSeek: state.pendingVideoSeek,
        historyTags,
        publishedVideos,
        recommendations,

        addVideo: (video: Omit<Video, 'id' | 'views'>) => dispatch(videoActions.addVideo(video)),
        editVideo: (id: string, partial: Partial<Video>) => dispatch(videoActions.editVideo({ id, partial })),
        deleteVideo: (id: string) => dispatch(videoActions.deleteVideo(id)),
        likeVideo: (id: string) => dispatch(videoActions.likeVideo(id)),
        dislikeVideo: (id: string) => dispatch(videoActions.dislikeVideo(id)),
        saveVideo: (id: string) => dispatch(videoActions.saveVideo(id)),
        watchVideo: (videoId: string) => dispatch(videoActions.watchVideo(videoId)),
        removeFromHistory: (videoId: string) => dispatch(videoActions.removeFromHistory(videoId)),
        clearHistory: () => dispatch(videoActions.clearHistory()),
        updateProgress: (videoId: string, percent: number) => dispatch(videoActions.updateProgress({ videoId, percent })),
        setAutoplay: (value: boolean) => dispatch(videoActions.setAutoplay(value)),
        openUploadModal: () => dispatch(videoActions.openUploadModal()),
        closeUploadModal: () => dispatch(videoActions.closeUploadModal()),
        openTagView: (tag: string, fromVideoId: string | null) => dispatch(videoActions.openTagView({ tag, fromVideoId })),
        closeTagView: () => dispatch(videoActions.closeTagView()),
        openMiniPlayer: (s: Omit<MiniPlayerState, 'seekSession'>) => dispatch(videoActions.openMiniPlayer(s)),
        closeMiniPlayer: () => dispatch(videoActions.closeMiniPlayer()),
        setPendingVideoSeek: (videoId: string, time: number) => dispatch(videoActions.setPendingVideoSeek({ videoId, time })),
        consumePendingVideoSeek,
        pinVideo: (id: string) => dispatch(videoActions.pinVideo(id)),
        unpinVideo: () => dispatch(videoActions.unpinVideo()),
        shortsMuted: state.shortsMuted,
        shortsVolume: state.shortsVolume,
        setShortsMuted: (muted: boolean) => dispatch(videoActions.setShortsMuted(muted)),
        setShortsVolume: (volume: number) => dispatch(videoActions.setShortsVolume(volume)),
    };
}
