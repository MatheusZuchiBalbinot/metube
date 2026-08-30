import { combineReducers } from '@reduxjs/toolkit';
import commentSlice from './commentSlice';
import videoSlice from './videoSlice';
import videoUiSlice from './videoUiSlice';
import playbackSlice from './playbackSlice';
import themeSlice from './themeSlice';
import authSlice, { signOutThunk } from './authSlice';
import toastSlice from './toastSlice';
import subscriptionSlice from './subscriptionSlice';
import playlistSlice from './playlistSlice';
import searchSlice from './searchSlice';
import notificationsSlice from './notificationsSlice';
import recentChannelsSlice from './recentChannelsSlice';

const appReducer = combineReducers({
    comment: commentSlice.reducer,
    video: videoSlice.reducer,
    videoUi: videoUiSlice.reducer,
    playback: playbackSlice.reducer,
    theme: themeSlice.reducer,
    auth: authSlice.reducer,
    toast: toastSlice.reducer,
    subscription: subscriptionSlice.reducer,
    playlist: playlistSlice.reducer,
    search: searchSlice.reducer,
    notifications: notificationsSlice.reducer,
    recentChannels: recentChannelsSlice.reducer,
});

/**
 * Wraps the combined reducer so the entire store resets to its initial state
 * on logout. Without this, slices `authSlice` never touches (watchHistory,
 * dislikedVideos, recentChannels, videoProgress, ...) would keep the previous
 * user's data in memory after `signOutThunk.fulfilled` and could be merged
 * into — and persisted for — the next user who logs in on the same browser.
 */
export const rootReducer: typeof appReducer = (state, action) => {
    if (action.type === signOutThunk.fulfilled.type) {
        return appReducer(undefined, action);
    }

    return appReducer(state, action);
};
