import { shallowEqual } from 'react-redux';
import { useAppSelector } from '@store';
import {
    selectAllVideos,
    selectHistoryTags,
    selectPublishedVideos,
    selectLikedSet,
    selectDislikedSet,
    selectRecommendations,
    selectRecommendationsLoading,
} from '@store/videoSelectors';

/**
 * Read-only video state. Each selector is granular, so a component subscribes
 * only to the slices it actually reads instead of the whole `useVideo` surface.
 */
export function useVideoData() {
    const videos = useAppSelector(selectAllVideos);
    const watchHistory = useAppSelector(s => s.video.watchHistory);
    const videoProgress = useAppSelector(s => s.video.videoProgress, shallowEqual);

    const historyTags = useAppSelector(selectHistoryTags);
    const publishedVideos = useAppSelector(selectPublishedVideos);
    const likedVideos = useAppSelector(selectLikedSet);
    const dislikedVideos = useAppSelector(selectDislikedSet);

    const recommendations = useAppSelector(selectRecommendations);
    const recommendationsLoading = useAppSelector(selectRecommendationsLoading);

    return {
        videos,
        watchHistory,
        videoProgress,
        historyTags,
        publishedVideos,
        likedVideos,
        dislikedVideos,
        recommendations,
        recommendationsLoading,
    };
}
