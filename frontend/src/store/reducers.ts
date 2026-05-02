import videoSlice from './videoSlice';
import themeSlice from './themeSlice';
import authSlice from './authSlice';
import toastSlice from './toastSlice';
import subscriptionSlice from './subscriptionSlice';
import playlistSlice from './playlistSlice';
import searchSlice from './searchSlice';

export const rootReducer = {
    video: videoSlice.reducer,
    theme: themeSlice.reducer,
    auth: authSlice.reducer,
    toast: toastSlice.reducer,
    subscription: subscriptionSlice.reducer,
    playlist: playlistSlice.reducer,
    search: searchSlice.reducer,
};
