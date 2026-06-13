import { createSlice, createEntityAdapter, type EntityState, type PayloadAction } from '@reduxjs/toolkit';
import type { Vuid } from '@api';
import { STORAGE_KEYS, loadFromStorage, isArray, isObject, isNumberInRange } from '@utils';
import type { Video, VideoId, VideoStatus, ViewCount } from '@models';

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
    autoplay: boolean
    pinnedVideoId: VideoId | null
    theaterMode: boolean
    shortsMuted: boolean
    shortsVolume: number
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
    autoplay: loadFromStorage<boolean>(STORAGE_KEYS.AUTOPLAY, true, v => typeof v === 'boolean'),
    pinnedVideoId: (localStorage.getItem(STORAGE_KEYS.PINNED_VIDEO) || null) as VideoId | null,
    theaterMode: loadFromStorage<boolean>(STORAGE_KEYS.THEATER_MODE, false, v => typeof v === 'boolean'),
    shortsMuted: loadFromStorage<boolean>(STORAGE_KEYS.SHORTS_MUTED, true, v => typeof v === 'boolean'),
    shortsVolume: loadFromStorage<number>(STORAGE_KEYS.SHORTS_VOLUME, 0.8, isNumberInRange(0, 1)),
    loading: false,
    error: null,
    lastVideoStatusUpdate: null,
    serverRecommendations: [],
    recommendationsLoading: false,
});

/** Moves an id to the front of the order, preserving "newest first" semantics. */
function prependVideoId(state: VideoState, id: VideoId) {
    state.ids = [id, ...(state.ids as VideoId[]).filter(existing => existing !== id)];
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
            const video = state.entities[action.payload.vuid as unknown as VideoId];
            const isFound = video !== undefined;
            if (isFound) {
                video.status = action.payload.status;
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
                video.views = (video.views + 1) as ViewCount;
            }
        },

        deleteVideo(state, action: PayloadAction<VideoId>) {
            const id = action.payload;
            videoAdapter.removeOne(state, id);
            state.watchHistory = state.watchHistory.filter(vid => vid !== id);
            state.likedVideos = state.likedVideos.filter(vid => vid !== id);
            state.dislikedVideos = state.dislikedVideos.filter(vid => vid !== id);
            const isPinned = state.pinnedVideoId === id;
            if (isPinned) {
                state.pinnedVideoId = null;
            }
        },

        likeVideo(state, action: PayloadAction<VideoId>) {
            const id = action.payload;
            const idx = state.likedVideos.indexOf(id);
            const isAlreadyLiked = idx !== -1;
            if (isAlreadyLiked) {
                state.likedVideos.splice(idx, 1);
            } else {
                state.likedVideos.push(id);
                state.dislikedVideos = state.dislikedVideos.filter(vid => vid !== id);
            }
        },

        dislikeVideo(state, action: PayloadAction<VideoId>) {
            const id = action.payload;
            const idx = state.dislikedVideos.indexOf(id);
            const isAlreadyDisliked = idx !== -1;
            if (isAlreadyDisliked) {
                state.dislikedVideos.splice(idx, 1);
            } else {
                state.dislikedVideos.push(id);
                state.likedVideos = state.likedVideos.filter(vid => vid !== id);
            }
        },

        watchVideo(state, action: PayloadAction<VideoId>) {
            const videoId = action.payload;
            const isAlreadyFirst = state.watchHistory[0] === videoId;
            if (!isAlreadyFirst) {
                state.watchHistory = [videoId, ...state.watchHistory.filter(id => id !== videoId)];
            }
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
            const isAlreadyInHistory = state.watchHistory.includes(videoId);
            if (!isAlreadyInHistory) {
                state.watchHistory = [videoId, ...state.watchHistory];
            }
        },

        setAutoplay(state, action: PayloadAction<boolean>) {
            state.autoplay = action.payload;
        },

        pinVideo(state, action: PayloadAction<VideoId>) {
            const isAlreadyPinned = state.pinnedVideoId === action.payload;
            state.pinnedVideoId = isAlreadyPinned ? null : action.payload;
        },

        unpinVideo(state) {
            state.pinnedVideoId = null;
        },

        setTheaterMode(state, action: PayloadAction<boolean>) {
            state.theaterMode = action.payload;
        },

        setShortsMuted(state, action: PayloadAction<boolean>) {
            state.shortsMuted = action.payload;
        },

        setShortsVolume(state, action: PayloadAction<number>) {
            state.shortsVolume = action.payload;
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
        xTabSetPinnedVideoId(state, action: PayloadAction<VideoId | null>) {
            state.pinnedVideoId = action.payload;
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
export default videoSlice;
