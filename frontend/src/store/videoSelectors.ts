import { createSelector } from '@reduxjs/toolkit';
import { domain } from '@domain';
import type { Tag, Video, VideoId } from '@models';
import type { VideoState } from './videoSlice';

interface WithVideo { video: VideoState }

const selectVideos = (s: WithVideo) => s.video.videos;

/**
 * Memoized `id → Video` map for O(1) lookups.
 *
 * Components that need a single video by id should prefer this (or
 * `makeSelectVideoById`) over scanning `state.video.videos` with `.find`, which
 * is O(n) on every render.
 */
export const selectVideoEntities = createSelector(
    [selectVideos],
    (videos): Map<VideoId, Video> => new Map(videos.map(v => [v.id, v])),
);

/**
 * Builds a memoized selector that resolves a single video by id in O(1) via the
 * shared entity map.
 *
 * @param id - The video id to resolve.
 * @returns A selector returning the matching video, or `undefined`.
 */
export function makeSelectVideoById(id: VideoId) {
    return createSelector(
        [selectVideoEntities],
        (entities): Video | undefined => entities.get(id),
    );
}

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
export const selectRecommendationsLoading = (s: WithVideo) => s.video.recommendationsLoading;

export const selectWatchedTagFrequency = createSelector(
    [(s: WithVideo) => s.video.watchHistory, selectVideoEntities],
    (watchHistory, videoMap): Map<Tag, number> => {
        const freq = new Map<Tag, number>();
        for (const id of watchHistory) {
            const video = videoMap.get(id);
            if (!video) {
                continue;
            }
            for (const tag of video.tags) {
                freq.set(tag, (freq.get(tag) ?? 0) + 1);
            }
        }
        return freq;
    },
);
