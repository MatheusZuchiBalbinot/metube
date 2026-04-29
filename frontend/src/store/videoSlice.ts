import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import { VideoStatus, type Video, type VideoId } from '@models/video';
import type { Tag } from '@models/tag';
import { STORAGE_KEYS } from '@utils/storageKeys';
import { loadFromStorage, isArray, isObject, isNumberInRange } from '@utils/loadFromStorage';

export interface WatchEvent {
    videoId: VideoId
    date: string
}

export interface TagView {
    tag: Tag
    fromVideoId: VideoId | null
}

export interface MiniPlayerState {
    videoId: VideoId
    currentTime: number
    seekSession: number
}

interface VideoState {
    videos: Video[]
    watchHistory: VideoId[]
    likedVideos: VideoId[]
    dislikedVideos: VideoId[]
    videoProgress: Record<string, number>
    autoplay: boolean
    uploadModalOpen: boolean
    activeTagView: TagView | null
    miniPlayer: MiniPlayerState | null
    pendingVideoSeek: { videoId: VideoId; time: number } | null
    watchEvents: WatchEvent[]
    pinnedVideoId: VideoId | null
    theaterMode: boolean
    shortsMuted: boolean
    shortsVolume: number
    loading: boolean
    error: string | null
}

const initialState: VideoState = {
    videos: [],
    watchHistory: loadFromStorage<VideoId[]>(STORAGE_KEYS.WATCH_HISTORY, [], isArray),
    likedVideos: loadFromStorage<VideoId[]>(STORAGE_KEYS.LIKED_VIDEOS, [], isArray),
    dislikedVideos: loadFromStorage<VideoId[]>(STORAGE_KEYS.DISLIKED_VIDEOS, [], isArray),
    videoProgress: loadFromStorage<Record<string, number>>(STORAGE_KEYS.VIDEO_PROGRESS, {}, isObject),
    autoplay: loadFromStorage<boolean>(STORAGE_KEYS.AUTOPLAY, true, v => typeof v === 'boolean'),
    uploadModalOpen: false,
    activeTagView: null,
    miniPlayer: null,
    pendingVideoSeek: null,
    watchEvents: loadFromStorage<WatchEvent[]>(STORAGE_KEYS.WATCH_EVENTS, [], isArray),
    pinnedVideoId: (localStorage.getItem(STORAGE_KEYS.PINNED_VIDEO) || null) as VideoId | null,
    theaterMode: false,
    shortsMuted: loadFromStorage<boolean>(STORAGE_KEYS.SHORTS_MUTED, true, v => typeof v === 'boolean'),
    shortsVolume: loadFromStorage<number>(STORAGE_KEYS.SHORTS_VOLUME, 0.8, isNumberInRange(0, 1)),
    loading: false,
    error: null,
};

const videoSlice = createSlice({
    name: 'video',
    initialState,
    reducers: {
        setVideos(state, action: PayloadAction<Video[]>) {
            state.videos = action.payload;
        },

        setLikedVideos(state, action: PayloadAction<VideoId[]>) {
            state.likedVideos = action.payload;
        },

        addVideo(state, action: PayloadAction<Video>) {
            state.videos.unshift(action.payload);
        },

        updateVideo(state, action: PayloadAction<Video>) {
            const idx = state.videos.findIndex(v => v.id === action.payload.id);
            const isFound = idx !== -1;
            if (isFound) {
                state.videos[idx] = action.payload;
            }
        },

        editVideo(state, action: PayloadAction<{ id: VideoId; partial: Partial<Video> }>) {
            const idx = state.videos.findIndex(v => v.id === action.payload.id);
            const isFound = idx !== -1;
            if (isFound) {
                Object.assign(state.videos[idx], action.payload.partial);
            }
        },

        incrementViews(state, action: PayloadAction<VideoId>) {
            const idx = state.videos.findIndex(v => v.id === action.payload);
            const isFound = idx !== -1;
            if (isFound) {
                state.videos[idx].views += 1;
            }
        },

        deleteVideo(state, action: PayloadAction<VideoId>) {
            const id = action.payload;
            state.videos = state.videos.filter(v => v.id !== id);
            state.watchHistory = state.watchHistory.filter(vid => vid !== id);
            state.watchEvents = state.watchEvents.filter(e => e.videoId !== id);
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
            state.watchEvents.push({ videoId, date: new Date().toISOString() });
        },

        removeFromHistory(state, action: PayloadAction<VideoId>) {
            state.watchHistory = state.watchHistory.filter(id => id !== action.payload);
        },

        clearHistory(state) {
            state.watchHistory = [];
        },

        updateProgress(state, action: PayloadAction<{ videoId: VideoId; percent: number }>) {
            state.videoProgress[action.payload.videoId] = action.payload.percent;
        },

        setAutoplay(state, action: PayloadAction<boolean>) {
            state.autoplay = action.payload;
        },

        openUploadModal(state) {
            state.uploadModalOpen = true;
        },

        closeUploadModal(state) {
            state.uploadModalOpen = false;
        },

        openTagView(state, action: PayloadAction<TagView>) {
            state.activeTagView = action.payload;
        },

        closeTagView(state) {
            state.activeTagView = null;
        },

        openMiniPlayer(state, action: PayloadAction<Omit<MiniPlayerState, 'seekSession'>>) {
            const prevSession = state.miniPlayer?.seekSession ?? 0;
            state.miniPlayer = { ...action.payload, seekSession: prevSession + 1 };
        },

        closeMiniPlayer(state) {
            state.miniPlayer = null;
        },

        setPendingVideoSeek(state, action: PayloadAction<{ videoId: VideoId; time: number }>) {
            state.pendingVideoSeek = action.payload;
        },

        clearPendingVideoSeek(state) {
            state.pendingVideoSeek = null;
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
    },
});

export const videoActions = videoSlice.actions;
export default videoSlice;

// ─── Selectors ────────────────────────────────────────────────────────────────

interface WithVideo { video: VideoState }

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
                const matchingTagCount = video.tags.filter(t => historyTagSet.has(t)).length;
                const hasAnyTag = video.tags.length > 0;
                const tagScore = hasAnyTag ? matchingTagCount / video.tags.length : 0;
                const viewsBoost = Math.log1p(video.views) / Math.log1p(maxViews);
                return tagScore * 0.85 + viewsBoost * 0.15;
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
// instead of a new one per component call to useVideo().
export const selectRecommendations = makeSelectRecommendations(200);
