import type { Middleware } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@utils/storageKeys';
import type { RootState } from './index';

export const localStorageMiddleware: Middleware = store => next => action => {
    const prev = store.getState() as RootState;
    const result = next(action);
    const next_ = store.getState() as RootState;

    const v = next_.video;
    const pv = prev.video;
    const t = next_.theme;
    const pt = prev.theme;

    if (v.watchHistory !== pv.watchHistory) {
        localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(v.watchHistory));
    }

    if (v.likedVideos !== pv.likedVideos) {
        localStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(v.likedVideos));
    }

    if (v.dislikedVideos !== pv.dislikedVideos) {
        localStorage.setItem(STORAGE_KEYS.DISLIKED_VIDEOS, JSON.stringify(v.dislikedVideos));
    }

    if (v.savedVideos !== pv.savedVideos) {
        localStorage.setItem(STORAGE_KEYS.SAVED_VIDEOS, JSON.stringify(v.savedVideos));
    }

    if (v.videoProgress !== pv.videoProgress) {
        localStorage.setItem(STORAGE_KEYS.VIDEO_PROGRESS, JSON.stringify(v.videoProgress));
    }

    if (v.autoplay !== pv.autoplay) {
        localStorage.setItem(STORAGE_KEYS.AUTOPLAY, String(v.autoplay));
    }

    if (v.watchEvents !== pv.watchEvents) {
        localStorage.setItem(STORAGE_KEYS.WATCH_EVENTS, JSON.stringify(v.watchEvents));
    }

    if (v.pinnedVideoId !== pv.pinnedVideoId) {
        localStorage.setItem(STORAGE_KEYS.PINNED_VIDEO, v.pinnedVideoId ?? '');
    }

    if (v.shortsMuted !== pv.shortsMuted) {
        localStorage.setItem(STORAGE_KEYS.SHORTS_MUTED, String(v.shortsMuted));
    }

    if (v.shortsVolume !== pv.shortsVolume) {
        localStorage.setItem(STORAGE_KEYS.SHORTS_VOLUME, String(v.shortsVolume));
    }

    if (t.mode !== pt.mode) {
        document.documentElement.dataset.mode = t.mode;
        localStorage.setItem(STORAGE_KEYS.THEME_MODE, t.mode);
    }

    if (t.color !== pt.color) {
        document.documentElement.dataset.color = t.color;
        localStorage.setItem(STORAGE_KEYS.THEME_COLOR, t.color);
    }

    return result;
};
