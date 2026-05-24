import { createListenerMiddleware, type ListenerEffectAPI } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@utils';
import type { RootState, AppDispatch } from './types';

export const persistMiddleware = createListenerMiddleware<RootState, AppDispatch>();

type PersistMiddleware = typeof persistMiddleware;
type EffectAPI = ListenerEffectAPI<RootState, AppDispatch>;

class StorePersistence {
    private readonly _mw: PersistMiddleware;

    constructor(mw: PersistMiddleware) {
        this._mw = mw;
    }

    // ─── Video ────────────────────────────────────────────────────────────────
    private readonly _persistVideo = async (_: unknown, api: EffectAPI): Promise<void> => {
        api.cancelActiveListeners();
        await api.delay(400);

        const { video } = api.getState();
        localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(video.watchHistory));
        localStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(video.likedVideos));
        localStorage.setItem(STORAGE_KEYS.DISLIKED_VIDEOS, JSON.stringify(video.dislikedVideos));
        localStorage.setItem(STORAGE_KEYS.VIDEO_PROGRESS, JSON.stringify(video.videoProgress));
        localStorage.setItem(STORAGE_KEYS.AUTOPLAY, JSON.stringify(video.autoplay));
        localStorage.setItem(STORAGE_KEYS.PINNED_VIDEO, video.pinnedVideoId ?? '');
        localStorage.setItem(STORAGE_KEYS.SHORTS_MUTED, JSON.stringify(video.shortsMuted));
        localStorage.setItem(STORAGE_KEYS.SHORTS_VOLUME, String(video.shortsVolume));
    };

    // ─── Theme ────────────────────────────────────────────────────────────────
    // Theme values are stored as raw strings (not JSON) so theme-init.js can
    // read them before React loads without needing JSON.parse.
    private readonly _persistTheme = async (_: unknown, api: EffectAPI): Promise<void> => {
        await api.delay(0); // flush immediately — theme changes feel instant

        const { theme } = api.getState();
        document.documentElement.dataset.mode = theme.mode;
        document.documentElement.dataset.color = theme.color;
        localStorage.setItem(STORAGE_KEYS.THEME_MODE, theme.mode);
        localStorage.setItem(STORAGE_KEYS.THEME_COLOR, theme.color);
    };

    // ─── Subscription ─────────────────────────────────────────────────────────
    private readonly _persistSubscription = async (_: unknown, api: EffectAPI): Promise<void> => {
        api.cancelActiveListeners();
        await api.delay(400);

        const { subscription } = api.getState();
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscription.subscribedChannelIds));
    };

    // ─── Playlist ─────────────────────────────────────────────────────────────
    // Also reacts to video/deleteVideo because playlistSlice.extraReducers
    // cascade-deletes videoIds from all playlists when a video is removed.
    private readonly _persistPlaylist = async (_: unknown, api: EffectAPI): Promise<void> => {
        api.cancelActiveListeners();
        await api.delay(400);

        const { playlist } = api.getState();
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlist.playlists));
    };

    // ─── Search ───────────────────────────────────────────────────────────────
    private readonly _persistSearch = async (_: unknown, api: EffectAPI): Promise<void> => {
        api.cancelActiveListeners();
        await api.delay(400);

        const { search } = api.getState();
        localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(search.recentSearches));
    };

    register(): void {
        this._mw.startListening({
            predicate: (action) =>
                action.type.startsWith('video/') && !action.type.includes('xTab'),
            effect: this._persistVideo,
        });
        this._mw.startListening({
            predicate: (action) => action.type.startsWith('theme/'),
            effect: this._persistTheme,
        });
        this._mw.startListening({
            predicate: (action) =>
                action.type.startsWith('subscription/') && !action.type.includes('xTab'),
            effect: this._persistSubscription,
        });
        this._mw.startListening({
            predicate: (action) =>
                (action.type.startsWith('playlist/') || action.type === 'video/deleteVideo') &&
                !action.type.includes('xTab'),
            effect: this._persistPlaylist,
        });
        this._mw.startListening({
            predicate: (action) => action.type.startsWith('search/'),
            effect: this._persistSearch,
        });
    }
}

new StorePersistence(persistMiddleware).register();
