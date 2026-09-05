// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { videoActions } from '@store/videoSlice';
import { playbackActions } from '@store/playbackSlice';
import { themeActions } from '@store/themeSlice';
import { subscriptionActions } from '@store/subscriptionSlice';
import { authActions, signOutThunk } from '@store/authSlice';
import { vid, chId } from '../helpers/factories';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

//
// authSlice's signOutThunk.fulfilled reducer only clears `auth.user` — every
// other slice (watchHistory, likedVideos, dislikedVideos, videoProgress,
// subscriptions, ...) would otherwise keep the previous user's data in memory
// after logout, which useBootstrap then merges into the next user who logs in
// on the same browser. rootReducer wraps the combined reducer so the entire
// store resets to its initial state whenever signOutThunk.fulfilled fires.

describe('rootReducer — logout resets full state', () => {
    it('resets every slice to its initial state on signOutThunk.fulfilled', () => {
        const store = makeStore();
        const initialState = store.getState();

        store.dispatch(videoActions.watchVideo(vid('v-1')));
        store.dispatch(videoActions.likeVideo(vid('v-2')));
        store.dispatch(playbackActions.setAutoplay(false));
        store.dispatch(themeActions.setMode('light'));
        store.dispatch(subscriptionActions.toggleSubscription(chId('ch-1')));
        store.dispatch(authActions.sessionExpired('Token expired'));

        expect(store.getState()).not.toEqual(initialState);

        store.dispatch({ type: signOutThunk.fulfilled.type });

        expect(store.getState()).toEqual(initialState);
    });

    it('clears watchHistory, likedVideos, dislikedVideos, and videoProgress specifically', () => {
        const store = makeStore();

        store.dispatch(videoActions.watchVideo(vid('v-1')));
        store.dispatch(videoActions.likeVideo(vid('v-2')));
        store.dispatch(videoActions.dislikeVideo(vid('v-3')));

        expect(store.getState().video.watchHistory.length).toBeGreaterThan(0);
        expect(store.getState().video.likedVideos.length).toBeGreaterThan(0);
        expect(store.getState().video.dislikedVideos.length).toBeGreaterThan(0);

        store.dispatch({ type: signOutThunk.fulfilled.type });

        expect(store.getState().video.watchHistory).toHaveLength(0);
        expect(store.getState().video.likedVideos).toHaveLength(0);
        expect(store.getState().video.dislikedVideos).toHaveLength(0);
    });

    it('does not reset state for unrelated actions', () => {
        const store = makeStore();
        store.dispatch(themeActions.setMode('light'));

        store.dispatch(playbackActions.setAutoplay(false));

        expect(store.getState().theme.mode).toBe('light');
        expect(store.getState().playback.autoplay).toBe(false);
    });
});
