/**
 * Cross-tab state synchronisation via the native `storage` event.
 *
 * The `storage` event fires only in OTHER tabs (never the one that wrote), so
 * dispatching xTab* actions here cannot create an infinite loop — the persist
 * listener is also excluded from writing for those action types.
 *
 * Synced state: theme (immediate), watch history, liked/disliked/saved videos,
 * pinned video, playlists, and subscriptions (all on next Redux render cycle).
 */

import type { AppDispatch } from './types';
import type { ChannelId } from '@models/channel';
import type { VideoId } from '@models/video';
import { themeActions } from './themeSlice';
import { videoActions } from './videoSlice';
import { playlistActions } from './playlistSlice';
import { subscriptionActions } from './subscriptionSlice';
import { STORAGE_KEYS } from '@utils/storageKeys';
import type { ThemeColor, ThemeMode } from '@utils/themes';
import type { Playlist } from '@models/playlist';

function parseJSON<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

type SyncHandler = (value: string) => void;

class CrossTabSyncer {
    private readonly dispatch: AppDispatch;

    constructor(dispatch: AppDispatch) {
        this.dispatch = dispatch;
    }

    private readonly _onThemeMode: SyncHandler = (value) => {
        this.dispatch(themeActions.setMode(value as ThemeMode));
        document.documentElement.dataset.mode = value;
    };

    private readonly _onThemeColor: SyncHandler = (value) => {
        this.dispatch(themeActions.setColor(value as ThemeColor));
        document.documentElement.dataset.color = value;
    };

    private readonly _onWatchHistory: SyncHandler = (value) => {
        const data = parseJSON<string[]>(value);
        const isValid = Array.isArray(data);
        if (isValid) {
            this.dispatch(videoActions.xTabSetWatchHistory(data as VideoId[]));
        }
    };

    private readonly _onLikedVideos: SyncHandler = (value) => {
        const data = parseJSON<string[]>(value);
        const isValid = Array.isArray(data);
        if (isValid) {
            this.dispatch(videoActions.xTabSetLikedVideos(data as VideoId[]));
        }
    };

    private readonly _onDislikedVideos: SyncHandler = (value) => {
        const data = parseJSON<string[]>(value);
        const isValid = Array.isArray(data);
        if (isValid) {
            this.dispatch(videoActions.xTabSetDislikedVideos(data as VideoId[]));
        }
    };

    private readonly _onPinnedVideo: SyncHandler = (value) => {
        this.dispatch(videoActions.xTabSetPinnedVideoId((value || null) as VideoId | null));
    };

    private readonly _onPlaylists: SyncHandler = (value) => {
        const data = parseJSON<Playlist[]>(value);
        const isValid = Array.isArray(data);
        if (isValid) {
            this.dispatch(playlistActions.xTabSetPlaylists(data));
        }
    };

    private readonly _onSubscriptions: SyncHandler = (value) => {
        const data = parseJSON<string[]>(value);
        const isValid = Array.isArray(data);
        if (isValid) {
            this.dispatch(subscriptionActions.xTabSetSubscriptions(data as ChannelId[]));
        }
    };

    private readonly _handlers: Record<string, SyncHandler> = {
        [STORAGE_KEYS.THEME_MODE]: this._onThemeMode,
        [STORAGE_KEYS.THEME_COLOR]: this._onThemeColor,
        [STORAGE_KEYS.WATCH_HISTORY]: this._onWatchHistory,
        [STORAGE_KEYS.LIKED_VIDEOS]: this._onLikedVideos,
        [STORAGE_KEYS.DISLIKED_VIDEOS]: this._onDislikedVideos,
        [STORAGE_KEYS.PINNED_VIDEO]: this._onPinnedVideo,
        [STORAGE_KEYS.PLAYLISTS]: this._onPlaylists,
        [STORAGE_KEYS.SUBSCRIPTIONS]: this._onSubscriptions,
    };

    private readonly _onStorageChange = (event: StorageEvent) => {
        const hasNewValue = event.newValue !== null;
        if (!hasNewValue) {
            return;
        }

        const handler = this._handlers[event.key ?? ''];
        if (handler) {
            handler(event.newValue);
        }
    };

    start(): () => void {
        window.addEventListener('storage', this._onStorageChange);
        return () => window.removeEventListener('storage', this._onStorageChange);
    }
}

export function initCrossTabSync(dispatch: AppDispatch): () => void {
    return new CrossTabSyncer(dispatch).start();
}
