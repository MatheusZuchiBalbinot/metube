import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import { MOCK_VIDEOS, VideoStatus, type Video } from '@data/mockVideos';
import { STORAGE_KEYS } from '@utils/storageKeys';

export interface TagView {
    tag: string
    fromVideoId: string | null
}

export interface MiniPlayerState {
    videoId: string
    currentTime: number
    seekSession: number
}

interface VideoState {
    videos: Video[]
    watchHistory: string[]
    likedVideos: string[]
    dislikedVideos: string[]
    savedVideos: string[]
    videoProgress: Record<string, number>
    autoplay: boolean
    uploadModalOpen: boolean
    activeTagView: TagView | null
    miniPlayer: MiniPlayerState | null
    pendingVideoSeek: { videoId: string; time: number } | null
    theaterMode: boolean
}

const SEED_HISTORY = ['v003', 'v001', 'v008', 'v005', 'v007'];
const SEED_PROGRESS: Record<string, number> = { v001: 67, v005: 38, v008: 82 };

function loadOrSeed<T>(key: string, seed: T): T {
    const stored = localStorage.getItem(key);
    if (stored === null) {
        localStorage.setItem(key, JSON.stringify(seed));
        return seed;
    }
    const parsed = JSON.parse(stored) as T;
    const isEmptyObject = typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed as object).length === 0;
    return isEmptyObject ? seed : parsed;
}

const initialState: VideoState = {
    videos: MOCK_VIDEOS,
    watchHistory: loadOrSeed<string[]>(STORAGE_KEYS.WATCH_HISTORY, SEED_HISTORY),
    likedVideos: loadOrSeed<string[]>(STORAGE_KEYS.LIKED_VIDEOS, []),
    dislikedVideos: loadOrSeed<string[]>(STORAGE_KEYS.DISLIKED_VIDEOS, []),
    savedVideos: loadOrSeed<string[]>(STORAGE_KEYS.SAVED_VIDEOS, []),
    videoProgress: loadOrSeed<Record<string, number>>(STORAGE_KEYS.VIDEO_PROGRESS, SEED_PROGRESS),
    autoplay: localStorage.getItem(STORAGE_KEYS.AUTOPLAY) === null
        ? true
        : localStorage.getItem(STORAGE_KEYS.AUTOPLAY) === 'true',
    uploadModalOpen: false,
    activeTagView: null,
    miniPlayer: null,
    pendingVideoSeek: null,
    theaterMode: false,
};

const videoSlice = createSlice({
    name: 'video',
    initialState,
    reducers: {
        addVideo(state, action: PayloadAction<Omit<Video, 'id' | 'views'>>) {
            state.videos.unshift({ ...action.payload, id: crypto.randomUUID(), views: 0 });
        },

        editVideo(state, action: PayloadAction<{ id: string; partial: Partial<Video> }>) {
            const idx = state.videos.findIndex(v => v.id === action.payload.id);
            const isFound = idx !== -1;
            if (isFound) {
                Object.assign(state.videos[idx], action.payload.partial);
            }
        },

        deleteVideo(state, action: PayloadAction<string>) {
            const id = action.payload;
            state.videos = state.videos.filter(v => v.id !== id);
            state.watchHistory = state.watchHistory.filter(vid => vid !== id);
            state.likedVideos = state.likedVideos.filter(vid => vid !== id);
            state.dislikedVideos = state.dislikedVideos.filter(vid => vid !== id);
            state.savedVideos = state.savedVideos.filter(vid => vid !== id);
        },

        likeVideo(state, action: PayloadAction<string>) {
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

        dislikeVideo(state, action: PayloadAction<string>) {
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

        saveVideo(state, action: PayloadAction<string>) {
            const id = action.payload;
            const idx = state.savedVideos.indexOf(id);
            const isAlreadySaved = idx !== -1;
            if (isAlreadySaved) {
                state.savedVideos.splice(idx, 1);
            } else {
                state.savedVideos.push(id);
            }
        },

        watchVideo(state, action: PayloadAction<string>) {
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

        removeFromHistory(state, action: PayloadAction<string>) {
            state.watchHistory = state.watchHistory.filter(id => id !== action.payload);
        },

        clearHistory(state) {
            state.watchHistory = [];
        },

        updateProgress(state, action: PayloadAction<{ videoId: string; percent: number }>) {
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

        setPendingVideoSeek(state, action: PayloadAction<{ videoId: string; time: number }>) {
            state.pendingVideoSeek = action.payload;
        },

        clearPendingVideoSeek(state) {
            state.pendingVideoSeek = null;
        },

        setTheaterMode(state, action: PayloadAction<boolean>) {
            state.theaterMode = action.payload;
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
            if (!isWatched) { continue; }
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

export const selectSavedSet = createSelector(
    [(s: WithVideo) => s.video.savedVideos],
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
