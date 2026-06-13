import commentSlice from './commentSlice';
import videoSlice from './videoSlice';
import videoUiSlice from './videoUiSlice';
import playbackSlice from './playbackSlice';
import themeSlice from './themeSlice';
import authSlice from './authSlice';
import toastSlice from './toastSlice';
import subscriptionSlice from './subscriptionSlice';
import playlistSlice from './playlistSlice';
import searchSlice from './searchSlice';
import notificationsSlice from './notificationsSlice';
import recentChannelsSlice from './recentChannelsSlice';

export const rootReducer = {
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
};
