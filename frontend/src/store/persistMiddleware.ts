import { createListenerMiddleware, type ListenerEffectAPI } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@utils';
import { videoObservableActions } from './videoSlice';
import type { RootState, AppDispatch } from './types';

export const persistMiddleware = createListenerMiddleware<RootState, AppDispatch>();

type EffectAPI = ListenerEffectAPI<RootState, AppDispatch>;
type ActionLike = { type: string };

/**
 * - `debounced`: cancel any in-flight run and wait `DEBOUNCE_MS` (coalesces bursts).
 * - `immediate`: run as soon as possible (used by theme so it feels instant).
 */
type PersistTiming = 'debounced' | 'immediate';

interface PersistDescriptor {
    predicate: (action: ActionLike) => boolean;
    effect: (api: EffectAPI) => void;
    timing: PersistTiming;
}

const DEBOUNCE_MS = 400;

/** Action type observed by playbackSlice/playlistSlice — derived, so renames break the build. */
const VIDEO_DELETE = videoObservableActions.deleteVideo.type;

/** Matches actions owned by `prefix`, excluding cross-tab sync actions (`xTab`). */
const ownActionFrom = (prefix: string) => (action: ActionLike): boolean =>
    action.type.startsWith(prefix) && !action.type.includes('xTab');

const descriptors: PersistDescriptor[] = [
    {
        predicate: ownActionFrom('video/'),
        timing: 'debounced',
        effect: ({ getState }) => {
            const { video } = getState();
            localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(video.watchHistory));
            localStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(video.likedVideos));
            localStorage.setItem(STORAGE_KEYS.DISLIKED_VIDEOS, JSON.stringify(video.dislikedVideos));
            localStorage.setItem(STORAGE_KEYS.VIDEO_PROGRESS, JSON.stringify(video.videoProgress));
        },
    },
    {
        // Also reacts to video/deleteVideo: playbackSlice clears pinnedVideoId on it.
        predicate: (action) => ownActionFrom('playback/')(action) || action.type === VIDEO_DELETE,
        timing: 'debounced',
        effect: ({ getState }) => {
            const { playback } = getState();
            localStorage.setItem(STORAGE_KEYS.AUTOPLAY, JSON.stringify(playback.autoplay));
            localStorage.setItem(STORAGE_KEYS.PINNED_VIDEO, JSON.stringify(playback.pinnedVideoId));
            localStorage.setItem(STORAGE_KEYS.SHORTS_MUTED, JSON.stringify(playback.shortsMuted));
            localStorage.setItem(STORAGE_KEYS.SHORTS_VOLUME, String(playback.shortsVolume));
            localStorage.setItem(STORAGE_KEYS.THEATER_MODE, JSON.stringify(playback.theaterMode));
        },
    },
    {
        // Theme values are stored as raw strings (not JSON) so theme-init.js can
        // read them before React loads without needing JSON.parse.
        predicate: (action) => action.type.startsWith('theme/'),
        timing: 'immediate',
        effect: ({ getState }) => {
            const { theme } = getState();
            localStorage.setItem(STORAGE_KEYS.THEME_MODE, theme.mode);
            localStorage.setItem(STORAGE_KEYS.THEME_COLOR, theme.color);
        },
    },
    {
        // DOM application is a separate concern from persistence — same trigger.
        predicate: (action) => action.type.startsWith('theme/'),
        timing: 'immediate',
        effect: ({ getState }) => {
            const { theme } = getState();
            document.documentElement.dataset.mode = theme.mode;
            document.documentElement.dataset.color = theme.color;
        },
    },
    {
        predicate: ownActionFrom('subscription/'),
        timing: 'debounced',
        effect: ({ getState }) => {
            const { subscription } = getState();
            localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscription.subscribedChannelIds));
        },
    },
    {
        // Also reacts to video/deleteVideo: playlistSlice cascade-deletes videoIds.
        predicate: (action) => ownActionFrom('playlist/')(action) || action.type === VIDEO_DELETE,
        timing: 'debounced',
        effect: ({ getState }) => {
            const { playlist } = getState();
            localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlist.playlists));
        },
    },
    {
        predicate: (action) => action.type.startsWith('search/'),
        timing: 'debounced',
        effect: ({ getState }) => {
            const { search } = getState();
            localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(search.recentSearches));
        },
    },
    {
        predicate: (action) => action.type.startsWith('recentChannels/'),
        timing: 'debounced',
        effect: ({ getState }) => {
            const { recentChannels } = getState();
            localStorage.setItem(STORAGE_KEYS.RECENT_CHANNELS, JSON.stringify(recentChannels.channels));
        },
    },
];

/** Wraps a descriptor's effect with its timing policy (debounce or run immediately). */
function toListenerEffect(descriptor: PersistDescriptor) {
    return async (_action: unknown, api: EffectAPI): Promise<void> => {
        if (descriptor.timing === 'debounced') {
            api.cancelActiveListeners();
            await api.delay(DEBOUNCE_MS);
        }

        descriptor.effect(api);
    };
}

for (const descriptor of descriptors) {
    persistMiddleware.startListening({
        predicate: descriptor.predicate,
        effect: toListenerEffect(descriptor),
    });
}
