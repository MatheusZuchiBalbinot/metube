import { createListenerMiddleware } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@utils/storageKeys';
import type { RootState, AppDispatch } from './types';

export const persistMiddleware = createListenerMiddleware<RootState, AppDispatch>();

// ─── Video slice ──────────────────────────────────────────────────────────────
// Excludes 'video/xTab*' actions (cross-tab sync) to prevent storage write loops.
persistMiddleware.startListening({
    predicate: (action) =>
        typeof action.type === 'string' &&
        action.type.startsWith('video/') &&
        !action.type.includes('xTab'),
    effect: async (_, api) => {
        api.cancelActiveListeners();
        await api.delay(400);

        const { video: sv } = api.getState();
        localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(sv.watchHistory));
        localStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(sv.likedVideos));
        localStorage.setItem(STORAGE_KEYS.DISLIKED_VIDEOS, JSON.stringify(sv.dislikedVideos));
        localStorage.setItem(STORAGE_KEYS.VIDEO_PROGRESS, JSON.stringify(sv.videoProgress));
        localStorage.setItem(STORAGE_KEYS.AUTOPLAY, JSON.stringify(sv.autoplay));
        localStorage.setItem(STORAGE_KEYS.WATCH_EVENTS, JSON.stringify(sv.watchEvents));
        localStorage.setItem(STORAGE_KEYS.PINNED_VIDEO, sv.pinnedVideoId ?? '');
        localStorage.setItem(STORAGE_KEYS.SHORTS_MUTED, JSON.stringify(sv.shortsMuted));
        localStorage.setItem(STORAGE_KEYS.SHORTS_VOLUME, String(sv.shortsVolume));
    },
});

// ─── Theme slice ──────────────────────────────────────────────────────────────
// Theme values are stored as raw strings (not JSON) so theme-init.js can read
// them before React loads without needing JSON.parse.
persistMiddleware.startListening({
    predicate: (action) =>
        typeof action.type === 'string' && action.type.startsWith('theme/'),
    effect: async (_, api) => {
        api.cancelActiveListeners();
        await api.delay(0); // flush immediately — theme changes feel instant

        const { theme: st } = api.getState();
        document.documentElement.dataset.mode = st.mode;
        document.documentElement.dataset.color = st.color;
        localStorage.setItem(STORAGE_KEYS.THEME_MODE, st.mode);
        localStorage.setItem(STORAGE_KEYS.THEME_COLOR, st.color);
    },
});

// ─── Subscription slice ───────────────────────────────────────────────────────
// Excludes 'subscription/xTab*' actions (cross-tab sync).
persistMiddleware.startListening({
    predicate: (action) =>
        typeof action.type === 'string' &&
        action.type.startsWith('subscription/') &&
        !action.type.includes('xTab'),
    effect: async (_, api) => {
        api.cancelActiveListeners();
        await api.delay(400);

        const { subscription: sub } = api.getState();
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(sub.subscribedChannelIds));
    },
});

// ─── Playlist slice ───────────────────────────────────────────────────────────
// Also reacts to video/deleteVideo because playlistSlice.extraReducers cascade-
// deletes videoIds from all playlists when a video is removed.
// Excludes 'playlist/xTab*' actions (cross-tab sync).
persistMiddleware.startListening({
    predicate: (action) =>
        typeof action.type === 'string' &&
        (action.type.startsWith('playlist/') || action.type === 'video/deleteVideo') &&
        !action.type.includes('xTab'),
    effect: async (_, api) => {
        api.cancelActiveListeners();
        await api.delay(400);

        const { playlist: pl } = api.getState();
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(pl.playlists));
    },
});

// ─── Search slice ─────────────────────────────────────────────────────────────
persistMiddleware.startListening({
    predicate: (action) =>
        typeof action.type === 'string' && action.type.startsWith('search/'),
    effect: async (_, api) => {
        api.cancelActiveListeners();
        await api.delay(400);

        const { search: sr } = api.getState();
        localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(sr.recentSearches));
    },
});
