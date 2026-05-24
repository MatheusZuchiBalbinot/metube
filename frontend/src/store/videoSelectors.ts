import { createSelector } from '@reduxjs/toolkit';
import { domain } from '@domain';
import type { Tag } from '@models/tag';
import type { VideoState } from './videoSlice';

interface WithVideo { video: VideoState }

export const selectHistoryTags = createSelector(
    [(s: WithVideo) => s.video.watchHistory, (s: WithVideo) => s.video.videos],
    (watchHistory, videos) => {
        const watchedIds = new Set(watchHistory);
        const tagSet = new Set<Tag>();

        for (const video of videos) {
            const isWatched = watchedIds.has(video.id);
            if (!isWatched) {
                continue;
            }
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet);
    },
);

export const selectPublishedVideos = createSelector(
    [(s: WithVideo) => s.video.videos],
    (videos) => {
        return videos.filter(v => domain.video.isVisible(v));
    },
);

export const selectLikedSet = createSelector(
    [(s: WithVideo) => s.video.likedVideos],
    (ids) => new Set(ids),
);

export const selectDislikedSet = createSelector(
    [(s: WithVideo) => s.video.dislikedVideos],
    (ids) => new Set(ids),
);

export const selectRecommendations = (s: WithVideo) => s.video.serverRecommendations;
