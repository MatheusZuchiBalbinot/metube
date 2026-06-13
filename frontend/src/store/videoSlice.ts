import { createSlice, createEntityAdapter, type EntityState, type PayloadAction } from '@reduxjs/toolkit';
import type { Vuid } from '@api';
import { STORAGE_KEYS, loadFromStorage, isArray, isObject } from '@utils';
import type { Video, VideoId, VideoStatus, ViewCount } from '@models';
import { moveToFront, toggleReaction } from './videoHelpers';

/**
 * The Redux entity id of a video IS its API `vuid` (`VideoId` and `Vuid` brand
 * the same underlying value — see `CLAUDE.frontend.md`). This is the single,
 * named bridge between the two brands.
 */
function toVideoId(vuid: Vuid): VideoId {
    return vuid as unknown as VideoId;
}

/**
 * Videos are normalized via `createEntityAdapter` (`ids` + `entities`) so lookups
 * and mutations are O(1) instead of scanning an array. Display order is preserved
 * in `ids`: newest videos are prepended (see `prependVideoId`).
 */
export const videoAdapter = createEntityAdapter<Video, VideoId>({
    selectId: video => video.id,
});

export interface VideoState extends EntityState<Video, VideoId> {
    watchHistory: VideoId[]
    likedVideos: VideoId[]
    dislikedVideos: VideoId[]
    videoProgress: Record<VideoId, number>
    loading: boolean
    error: string | null
    lastVideoStatusUpdate: { vuid: Vuid; status: VideoStatus } | null
    serverRecommendations: Video[]
    recommendationsLoading: boolean
}

const initialState: VideoState = videoAdapter.getInitialState({
    watchHistory: loadFromStorage<VideoId[]>(STORAGE_KEYS.WATCH_HISTORY, [], isArray),
    likedVideos: loadFromStorage<VideoId[]>(STORAGE_KEYS.LIKED_VIDEOS, [], isArray),
    dislikedVideos: loadFromStorage<VideoId[]>(STORAGE_KEYS.DISLIKED_VIDEOS, [], isArray),
    videoProgress: loadFromStorage<Record<VideoId, number>>(STORAGE_KEYS.VIDEO_PROGRESS, {}, isObject),
    loading: false,
    error: null,
    lastVideoStatusUpdate: null,
    serverRecommendations: [],
    recommendationsLoading: false,
});

/** Moves an id to the front of the entity order, preserving "newest first" semantics. */
function prependVideoId(state: VideoState, id: VideoId) {
    state.ids = moveToFront(state.ids as VideoId[], id);
}

const videoSlice = createSlice({
    name: 'video',
    initialState,
    reducers: {
        setVideos(state, action: PayloadAction<Video[]>) {
            videoAdapter.setAll(state, action.payload);
        },

        setLikedVideos(state, action: PayloadAction<VideoId[]>) {
            state.likedVideos = action.payload;
        },

        addVideo(state, action: PayloadAction<Video>) {
            videoAdapter.addOne(state, action.payload);
            prependVideoId(state, action.payload.id);
        },

        updateVideoStatus(state, action: PayloadAction<{ vuid: Vuid; status: VideoStatus }>) {
            state.lastVideoStatusUpdate = action.payload;
            const id = toVideoId(action.payload.vuid);
            const isFound = state.entities[id] !== undefined;
            if (isFound) {
                videoAdapter.updateOne(state, { id, changes: { status: action.payload.status } });
            }
        },

        updateVideo(state, action: PayloadAction<Video>) {
            const isFound = state.entities[action.payload.id] !== undefined;
            if (isFound) {
                videoAdapter.setOne(state, action.payload);
            }
        },

        upsertVideo(state, action: PayloadAction<Video>) {
            const isNew = state.entities[action.payload.id] === undefined;
            videoAdapter.upsertOne(state, action.payload);
            if (isNew) {
                prependVideoId(state, action.payload.id);
            }
        },

        editVideo(state, action: PayloadAction<{ id: VideoId; partial: Partial<Video> }>) {
            const isFound = state.entities[action.payload.id] !== undefined;
            if (isFound) {
                videoAdapter.updateOne(state, { id: action.payload.id, changes: action.payload.partial });
            }
        },

        incrementViews(state, action: PayloadAction<VideoId>) {
            const video = state.entities[action.payload];
            const isFound = video !== undefined;
            if (isFound) {
                videoAdapter.updateOne(state, {
                    id: action.payload,
                    changes: { views: (video.views + 1) as ViewCount },
                });
            }
        },

        deleteVideo(state, action: PayloadAction<VideoId>) {
            const id = action.payload;
            videoAdapter.removeOne(state, id);
            state.watchHistory = state.watchHistory.filter(vid => vid !== id);
            state.likedVideos = state.likedVideos.filter(vid => vid !== id);
            state.dislikedVideos = state.dislikedVideos.filter(vid => vid !== id);
            // playbackSlice clears pinnedVideoId via its own video/deleteVideo case.
        },

        likeVideo(state, action: PayloadAction<VideoId>) {
            const next = toggleReaction(state.likedVideos, state.dislikedVideos, action.payload);
            state.likedVideos = next.primary;
            state.dislikedVideos = next.opposite;
        },

        dislikeVideo(state, action: PayloadAction<VideoId>) {
            const next = toggleReaction(state.dislikedVideos, state.likedVideos, action.payload);
            state.dislikedVideos = next.primary;
            state.likedVideos = next.opposite;
        },

        watchVideo(state, action: PayloadAction<VideoId>) {
            const videoId = action.payload;
            state.watchHistory = moveToFront(state.watchHistory, videoId);
            const hasProgress = (state.videoProgress[videoId] ?? 0) > 0;
            if (!hasProgress) {
                state.videoProgress[videoId] = 10;
            }
        },

        removeFromHistory(state, action: PayloadAction<VideoId>) {
            state.watchHistory = state.watchHistory.filter(id => id !== action.payload);
        },

        clearHistory(state) {
            state.watchHistory = [];
        },

        restoreHistory(state, action: PayloadAction<VideoId[]>) {
            state.watchHistory = action.payload;
        },

        updateProgress(state, action: PayloadAction<{ videoId: VideoId; percent: number }>) {
            state.videoProgress[action.payload.videoId] = action.payload.percent;
        },

        setVideoProgress(state, action: PayloadAction<Record<VideoId, number>>) {
            state.videoProgress = action.payload;
        },

        videoFinished(state, action: PayloadAction<VideoId>) {
            const videoId = action.payload;
            state.videoProgress[videoId] = 100;
            state.watchHistory = moveToFront(state.watchHistory, videoId);
        },

        // ─── Cross-tab sync reducers ───────────────────────────────────────────
        // Dispatched only by crossTabSync — must NOT trigger the persist listener
        // (names start with 'video/xTab' which the predicate explicitly excludes).
        xTabSetWatchHistory(state, action: PayloadAction<VideoId[]>) {
            state.watchHistory = action.payload;
        },
        xTabSetLikedVideos(state, action: PayloadAction<VideoId[]>) {
            state.likedVideos = action.payload;
        },
        xTabSetDislikedVideos(state, action: PayloadAction<VideoId[]>) {
            state.dislikedVideos = action.payload;
        },

        setServerRecommendations(state, action: PayloadAction<Video[]>) {
            state.serverRecommendations = action.payload;
        },

        appendServerRecommendations(state, action: PayloadAction<Video[]>) {
            const existing = new Set(state.serverRecommendations.map(v => v.id));
            const incoming = action.payload.filter(v => !existing.has(v.id));
            state.serverRecommendations.push(...incoming);
        },

        setRecommendationsLoading(state, action: PayloadAction<boolean>) {
            state.recommendationsLoading = action.payload;
        },
    },
});

export const videoActions = videoSlice.actions;

/**
 * The subset of video actions that other slices observe via `extraReducers`
 * (playbackSlice clears the pinned video, playlistSlice cascade-deletes
 * videoIds) and that `persistMiddleware` watches. This is the video slice's
 * "public API" for cross-slice reactions — keep it in sync when adding new
 * cross-slice dependencies. Because the `.type` is derived from the real action
 * creator, renaming an action breaks compilation at every dependent site
 * instead of failing silently.
 */
export const videoObservableActions = {
    deleteVideo: videoActions.deleteVideo,
} as const;

export default videoSlice;
