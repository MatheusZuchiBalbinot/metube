import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Vuid } from '@api';
import { STORAGE_KEYS, loadFromStorage, isArray, isObject, isNumberInRange } from '@utils';
import type { Video, VideoId, VideoStatus, Tag } from '@models';

export interface TagView {
    tag: Tag
    fromVideoId: VideoId | null
}

export interface MiniPlayerState {
    videoId: VideoId
    currentTime: number
    seekSession: number
}

export interface VideoState {
    videos: Video[]
    watchHistory: VideoId[]
    likedVideos: VideoId[]
    dislikedVideos: VideoId[]
    videoProgress: Record<VideoId, number>
    autoplay: boolean
    uploadModalOpen: boolean
    activeTagView: TagView | null
    miniPlayer: MiniPlayerState | null
    pendingVideoSeek: { videoId: VideoId; time: number } | null
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

const initialState: VideoState = {
    videos: [],
    watchHistory: loadFromStorage<VideoId[]>(STORAGE_KEYS.WATCH_HISTORY, [], isArray),
    likedVideos: loadFromStorage<VideoId[]>(STORAGE_KEYS.LIKED_VIDEOS, [], isArray),
    dislikedVideos: loadFromStorage<VideoId[]>(STORAGE_KEYS.DISLIKED_VIDEOS, [], isArray),
    videoProgress: loadFromStorage<Record<VideoId, number>>(STORAGE_KEYS.VIDEO_PROGRESS, {}, isObject),
    autoplay: loadFromStorage<boolean>(STORAGE_KEYS.AUTOPLAY, true, v => typeof v === 'boolean'),
    uploadModalOpen: false,
    activeTagView: null,
    miniPlayer: null,
    pendingVideoSeek: null,
    pinnedVideoId: (localStorage.getItem(STORAGE_KEYS.PINNED_VIDEO) || null) as VideoId | null,
    theaterMode: false,
    shortsMuted: loadFromStorage<boolean>(STORAGE_KEYS.SHORTS_MUTED, true, v => typeof v === 'boolean'),
    shortsVolume: loadFromStorage<number>(STORAGE_KEYS.SHORTS_VOLUME, 0.8, isNumberInRange(0, 1)),
    loading: false,
    error: null,
    lastVideoStatusUpdate: null,
    serverRecommendations: [],
    recommendationsLoading: false,
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

        updateVideoStatus(state, action: PayloadAction<{ vuid: Vuid; status: VideoStatus }>) {
            state.lastVideoStatusUpdate = action.payload;
            const idx = state.videos.findIndex(v => (v.id as string) === (action.payload.vuid as string));
            const isFound = idx !== -1;
            if (isFound) {
                state.videos[idx].status = action.payload.status;
            }
        },

        updateVideo(state, action: PayloadAction<Video>) {
            const idx = state.videos.findIndex(v => v.id === action.payload.id);
            const isFound = idx !== -1;
            if (isFound) {
                state.videos[idx] = action.payload;
            }
        },

        upsertVideo(state, action: PayloadAction<Video>) {
            const idx = state.videos.findIndex(v => v.id === action.payload.id);
            const isFound = idx !== -1;
            if (isFound) {
                state.videos[idx] = action.payload;
            } else {
                state.videos.unshift(action.payload);
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

        setServerRecommendations(state, action: PayloadAction<Video[]>) {
            state.serverRecommendations = action.payload;
        },

        setRecommendationsLoading(state, action: PayloadAction<boolean>) {
            state.recommendationsLoading = action.payload;
        },
    },
});

export const videoActions = videoSlice.actions;
export default videoSlice;

