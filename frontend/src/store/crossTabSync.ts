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
import type { Playlist } from '@data/mockPlaylists';

function parseJSON<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

type SyncHandler = (value: string) => void;

export function initCrossTabSync(dispatch: AppDispatch): () => void {
    const SYNC_HANDLERS: Record<string, SyncHandler> = {
        [STORAGE_KEYS.THEME_MODE]: (value: string) => {
            dispatch(themeActions.setMode(value as ThemeMode));
            document.documentElement.dataset.mode = value;
        },
        [STORAGE_KEYS.THEME_COLOR]: (value: string) => {
            dispatch(themeActions.setColor(value as ThemeColor));
            document.documentElement.dataset.color = value;
        },
        [STORAGE_KEYS.WATCH_HISTORY]: (value: string) => {
            const data = parseJSON<string[]>(value);
            const isValid = Array.isArray(data);
            if (isValid) {
                dispatch(videoActions.xTabSetWatchHistory(data as VideoId[]));
            }
        },
        [STORAGE_KEYS.LIKED_VIDEOS]: (value: string) => {
            const data = parseJSON<string[]>(value);
            const isValid = Array.isArray(data);
            if (isValid) {
                dispatch(videoActions.xTabSetLikedVideos(data as VideoId[]));
            }
        },
        [STORAGE_KEYS.DISLIKED_VIDEOS]: (value: string) => {
            const data = parseJSON<string[]>(value);
            const isValid = Array.isArray(data);
            if (isValid) {
                dispatch(videoActions.xTabSetDislikedVideos(data as VideoId[]));
            }
        },
        [STORAGE_KEYS.SAVED_VIDEOS]: (value: string) => {
            const data = parseJSON<string[]>(value);
            const isValid = Array.isArray(data);
            if (isValid) {
                dispatch(videoActions.xTabSetSavedVideos(data as VideoId[]));
            }
        },
        [STORAGE_KEYS.PINNED_VIDEO]: (value: string) => {
            dispatch(videoActions.xTabSetPinnedVideoId((value || null) as VideoId | null));
        },
        [STORAGE_KEYS.PLAYLISTS]: (value: string) => {
            const data = parseJSON<Playlist[]>(value);
            const isValid = Array.isArray(data);
            if (isValid) {
                dispatch(playlistActions.xTabSetPlaylists(data));
            }
        },
        [STORAGE_KEYS.SUBSCRIPTIONS]: (value: string) => {
            const data = parseJSON<string[]>(value);
            const isValid = Array.isArray(data);
            if (isValid) {
                dispatch(subscriptionActions.xTabSetSubscriptions(data as ChannelId[]));
            }
        },
    };

    function handleStorageChange(event: StorageEvent) {
        const hasNewValue = event.newValue !== null;
        if (!hasNewValue) {
            return;
        }

        const handler = SYNC_HANDLERS[event.key ?? ''];
        if (handler) {
            handler(event.newValue);
        }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
}
