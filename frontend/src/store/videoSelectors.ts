import { createSelector } from '@reduxjs/toolkit';
import { VideoStatus, type Video } from '@models/video';
import type { VideoState } from './videoSlice';

interface WithVideo { video: VideoState }

// Weights for the recommendation score: tags are a stronger signal than views.
const TAG_WEIGHT = 0.85;
const VIEWS_WEIGHT = 0.15;

export const selectHistoryTags = createSelector(
    [(s: WithVideo) => s.video.watchHistory, (s: WithVideo) => s.video.videos],
    (watchHistory, videos) => {
        const watchedIds = new Set(watchHistory);
        const tagSet = new Set<string>();

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
        const now = new Date();
        return videos.filter(v => {
            const isPublished = v.status === VideoStatus.PUBLISHED;
            const isScheduledAndPast =
                v.status === VideoStatus.SCHEDULED &&
                v.scheduledAt !== undefined &&
                new Date(v.scheduledAt) <= now;
            return isPublished || isScheduledAndPast;
        });
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

export function makeSelectRecommendations(limit: number) {
    return createSelector(
        [selectPublishedVideos, selectHistoryTags],
        (publishedVideos, historyTags) => {
            const hasHistory = historyTags.length > 0;
            if (!hasHistory) {
                return [...publishedVideos].sort((a, b) => b.views - a.views).slice(0, limit);
            }

            const historyTagSet = new Set(historyTags);
            const maxViews = Math.max(...publishedVideos.map(v => v.views), 1);

            function scoreVideo(video: Video): number {
                const matchingTagCount = video.tags.filter((t: string) => historyTagSet.has(t)).length;
                const hasAnyTag = video.tags.length > 0;
                const tagScore = hasAnyTag ? matchingTagCount / video.tags.length : 0;
                const viewsBoost = Math.log1p(video.views) / Math.log1p(maxViews);
                return tagScore * TAG_WEIGHT + viewsBoost * VIEWS_WEIGHT;
            }

            return [...publishedVideos]
                .map(v => ({ video: v, score: scoreVideo(v) }))
                .sort((a, b) => b.score - a.score)
                .map(({ video }) => video)
                .slice(0, limit);
        },
    );
}

// Singleton for the common 200-item use-case — one shared memoised instance
// instead of a new one per component call.
export const selectRecommendations = makeSelectRecommendations(200);
