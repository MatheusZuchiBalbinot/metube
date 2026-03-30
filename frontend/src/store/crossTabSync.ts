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

export function initCrossTabSync(dispatch: AppDispatch): () => void {
    function handleStorageChange(event: StorageEvent) {
        const hasNewValue = event.newValue !== null;
        if (!hasNewValue) {
            return;
        }

        switch (event.key) {
            // ─── Theme ─────────────────────────────────────────────────────────
            case STORAGE_KEYS.THEME_MODE: {
                const mode = event.newValue as ThemeMode;
                dispatch(themeActions.setMode(mode));
                document.documentElement.dataset.mode = mode;
                break;
            }
            case STORAGE_KEYS.THEME_COLOR: {
                const color = event.newValue as ThemeColor;
                dispatch(themeActions.setColor(color));
                document.documentElement.dataset.color = color;
                break;
            }

            // ─── Video state ────────────────────────────────────────────────────
            case STORAGE_KEYS.WATCH_HISTORY: {
                const data = parseJSON<string[]>(event.newValue);
                const isValid = Array.isArray(data);
                if (isValid) {
                    dispatch(videoActions.xTabSetWatchHistory(data as VideoId[]));
                }
                break;
            }
            case STORAGE_KEYS.LIKED_VIDEOS: {
                const data = parseJSON<string[]>(event.newValue);
                const isValid = Array.isArray(data);
                if (isValid) {
                    dispatch(videoActions.xTabSetLikedVideos(data as VideoId[]));
                }
                break;
            }
            case STORAGE_KEYS.DISLIKED_VIDEOS: {
                const data = parseJSON<string[]>(event.newValue);
                const isValid = Array.isArray(data);
                if (isValid) {
                    dispatch(videoActions.xTabSetDislikedVideos(data as VideoId[]));
                }
                break;
            }
            case STORAGE_KEYS.SAVED_VIDEOS: {
                const data = parseJSON<string[]>(event.newValue);
                const isValid = Array.isArray(data);
                if (isValid) {
                    dispatch(videoActions.xTabSetSavedVideos(data as VideoId[]));
                }
                break;
            }
            case STORAGE_KEYS.PINNED_VIDEO: {
                dispatch(videoActions.xTabSetPinnedVideoId((event.newValue || null) as VideoId | null));
                break;
            }

            // ─── Playlists ──────────────────────────────────────────────────────
            case STORAGE_KEYS.PLAYLISTS: {
                const data = parseJSON<Playlist[]>(event.newValue);
                const isValid = Array.isArray(data);
                if (isValid) {
                    dispatch(playlistActions.xTabSetPlaylists(data));
                }
                break;
            }

            // ─── Subscriptions ──────────────────────────────────────────────────
            case STORAGE_KEYS.SUBSCRIPTIONS: {
                const data = parseJSON<string[]>(event.newValue);
                const isValid = Array.isArray(data);
                if (isValid) {
                    dispatch(subscriptionActions.xTabSetSubscriptions(data as ChannelId[]));
                }
                break;
            }
        }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
}
