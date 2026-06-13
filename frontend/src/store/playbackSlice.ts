import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS, loadFromStorage, isNumberInRange } from '@utils';
import type { VideoId } from '@models';
import { videoObservableActions } from './videoSlice';

/** A stored pinned video is either a video id string or null. */
function isPinnedVideo(value: unknown): boolean {
    return value === null || typeof value === 'string';
}

/**
 * Persisted playback preferences and the pinned mini-player. Lives apart from
 * `videoSlice` (video data) and `videoUiSlice` (ephemeral UI) so persistence and
 * cross-tab sync target a focused slice.
 *
 * Persisted by `persistMiddleware` (keys in `STORAGE_KEYS`); `pinnedVideoId` is
 * also cross-tab synced and cleared when its video is deleted.
 */
export interface PlaybackState {
    autoplay: boolean
    pinnedVideoId: VideoId | null
    theaterMode: boolean
    shortsMuted: boolean
    shortsVolume: number
}

const initialState: PlaybackState = {
    autoplay: loadFromStorage<boolean>(STORAGE_KEYS.AUTOPLAY, true, v => typeof v === 'boolean'),
    pinnedVideoId: loadFromStorage<VideoId | null>(STORAGE_KEYS.PINNED_VIDEO, null, isPinnedVideo),
    theaterMode: loadFromStorage<boolean>(STORAGE_KEYS.THEATER_MODE, false, v => typeof v === 'boolean'),
    shortsMuted: loadFromStorage<boolean>(STORAGE_KEYS.SHORTS_MUTED, true, v => typeof v === 'boolean'),
    shortsVolume: loadFromStorage<number>(STORAGE_KEYS.SHORTS_VOLUME, 0.8, isNumberInRange(0, 1)),
};

const playbackSlice = createSlice({
    name: 'playback',
    initialState,
    reducers: {
        setAutoplay(state, action: PayloadAction<boolean>) {
            state.autoplay = action.payload;
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

        // Dispatched only by crossTabSync — excluded from the persist predicate.
        xTabSetPinnedVideoId(state, action: PayloadAction<VideoId | null>) {
            state.pinnedVideoId = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Mirror videoSlice's cascade: a deleted video can no longer stay pinned.
        builder.addCase(videoObservableActions.deleteVideo, (state, action) => {
            const isPinned = state.pinnedVideoId === action.payload;
            if (isPinned) {
                state.pinnedVideoId = null;
            }
        });
    },
});

export const playbackActions = playbackSlice.actions;
export default playbackSlice;
