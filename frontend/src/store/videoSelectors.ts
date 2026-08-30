import { createSelector } from '@reduxjs/toolkit';
import { domain } from '@domain';
import { collectTags } from '@utils';
import type { Tag, Video, VideoId } from '@models';
import { videoAdapter, type VideoState } from './videoSlice';

interface WithVideo { video: VideoState }

const adapterSelectors = videoAdapter.getSelectors((s: WithVideo) => s.video);

/** All videos in display order (`ids`). Memoized by the entity adapter. */
export const selectAllVideos = adapterSelectors.selectAll;

/**
 * The normalized `id → Video` dictionary for O(1) lookups.
 *
 * Components that need a single video by id should prefer this (or
 * `makeSelectVideoById`) over scanning the full list with `.find`.
 */
export const selectVideoEntities = adapterSelectors.selectEntities;

/** Builds a memoized selector that resolves a single video by id in O(1). */
export function makeSelectVideoById(id: VideoId) {
    return createSelector(
        [selectVideoEntities],
        (entities): Video | undefined => entities[id],
    );
}

export const selectHistoryTags = createSelector(
    [(s: WithVideo) => s.video.watchHistory, selectAllVideos],
    (watchHistory, videos) => {
        const watchedIds = new Set(watchHistory);
        const watchedVideos = videos.filter(video => watchedIds.has(video.id));
        return collectTags(watchedVideos);
    },
);

export const selectPublishedVideos = createSelector(
    [selectAllVideos],
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
            const video = videoMap[id];
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
