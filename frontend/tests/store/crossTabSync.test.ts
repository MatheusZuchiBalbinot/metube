// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { initCrossTabSync } from '@store/crossTabSync';
import { themeActions } from '@store/themeSlice';
import { videoActions } from '@store/videoSlice';
import { playbackActions } from '@store/playbackSlice';
import playlistSlice, { playlistActions } from '@store/playlistSlice';
import { subscriptionActions } from '@store/subscriptionSlice';
import { STORAGE_KEYS } from '@utils/storageKeys';
import type { AppDispatch } from '@store/types';
import type { Playlist } from '@models';

function fireStorageEvent(key: string, newValue: string | null) {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

describe('crossTabSync', () => {
    let dispatch: AppDispatch;
    let cleanup: () => void;

    beforeEach(() => {
        dispatch = vi.fn() as unknown as AppDispatch;
        cleanup = initCrossTabSync(dispatch);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    // ─── Listener setup and teardown ──────────────────────────────────────────

    describe('listener lifecycle', () => {
        it('returns a cleanup function', () => {
            expect(typeof cleanup).toBe('function');
        });

        it('stops reacting to storage events after cleanup is called', () => {
            cleanup();

            fireStorageEvent(STORAGE_KEYS.THEME_MODE, 'light');

            expect(dispatch).not.toHaveBeenCalled();
        });
    });

    // ─── Theme sync ───────────────────────────────────────────────────────────

    describe('theme mode', () => {
        it('dispatches themeActions.setMode when THEME_MODE storage event fires', () => {
            fireStorageEvent(STORAGE_KEYS.THEME_MODE, 'light');

            expect(dispatch).toHaveBeenCalledWith(themeActions.setMode('light'));
        });

        it('sets document.documentElement.dataset.mode', () => {
            fireStorageEvent(STORAGE_KEYS.THEME_MODE, 'light');

            expect(document.documentElement.dataset.mode).toBe('light');
        });
    });

    describe('theme color', () => {
        it('dispatches themeActions.setColor when THEME_COLOR storage event fires', () => {
            fireStorageEvent(STORAGE_KEYS.THEME_COLOR, 'blue');

            expect(dispatch).toHaveBeenCalledWith(themeActions.setColor('blue'));
        });

        it('sets document.documentElement.dataset.color', () => {
            fireStorageEvent(STORAGE_KEYS.THEME_COLOR, 'blue');

            expect(document.documentElement.dataset.color).toBe('blue');
        });
    });

    // ─── Video sync ───────────────────────────────────────────────────────────

    describe('watch history', () => {
        it('dispatches xTabSetWatchHistory with the parsed array', () => {
            const history = ['v1', 'v2'];

            fireStorageEvent(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(history));

            expect(dispatch).toHaveBeenCalledWith(
                videoActions.xTabSetWatchHistory(expect.arrayContaining(['v1', 'v2'])),
            );
        });

        it('ignores a malformed JSON value', () => {
            fireStorageEvent(STORAGE_KEYS.WATCH_HISTORY, 'not-json{{{');

            const watchCalls = (dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
                ([action]: [{ type: string }]) => action.type === 'video/xTabSetWatchHistory',
            );
            expect(watchCalls).toHaveLength(0);
        });

        it('ignores a non-array JSON value', () => {
            fireStorageEvent(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify({ foo: 'bar' }));

            const watchCalls = (dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
                ([action]: [{ type: string }]) => action.type === 'video/xTabSetWatchHistory',
            );
            expect(watchCalls).toHaveLength(0);
        });
    });

    describe('liked videos', () => {
        it('dispatches xTabSetLikedVideos with the parsed array', () => {
            fireStorageEvent(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(['v-liked']));

            expect(dispatch).toHaveBeenCalledWith(
                videoActions.xTabSetLikedVideos(expect.arrayContaining(['v-liked'])),
            );
        });

        it('ignores a malformed JSON value', () => {
            fireStorageEvent(STORAGE_KEYS.LIKED_VIDEOS, 'not-json{{{');

            const calls = (dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
                ([action]: [{ type: string }]) => action.type === 'video/xTabSetLikedVideos',
            );
            expect(calls).toHaveLength(0);
        });
    });

    describe('disliked videos', () => {
        it('dispatches xTabSetDislikedVideos with the parsed array', () => {
            fireStorageEvent(STORAGE_KEYS.DISLIKED_VIDEOS, JSON.stringify(['v-dis']));

            expect(dispatch).toHaveBeenCalledWith(
                videoActions.xTabSetDislikedVideos(expect.arrayContaining(['v-dis'])),
            );
        });

        it('ignores a malformed JSON value', () => {
            fireStorageEvent(STORAGE_KEYS.DISLIKED_VIDEOS, 'not-json{{{');

            const calls = (dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
                ([action]: [{ type: string }]) => action.type === 'video/xTabSetDislikedVideos',
            );
            expect(calls).toHaveLength(0);
        });
    });

    describe('pinned video', () => {
        it('dispatches xTabSetPinnedVideoId with the parsed id from JSON', () => {
            fireStorageEvent(STORAGE_KEYS.PINNED_VIDEO, '"v-pinned"');

            expect(dispatch).toHaveBeenCalledWith(
                playbackActions.xTabSetPinnedVideoId('v-pinned'),
            );
        });

        it('dispatches xTabSetPinnedVideoId with null when value is JSON null', () => {
            fireStorageEvent(STORAGE_KEYS.PINNED_VIDEO, 'null');

            expect(dispatch).toHaveBeenCalledWith(
                playbackActions.xTabSetPinnedVideoId(null),
            );
        });
    });

    // ─── Playlist sync ────────────────────────────────────────────────────────

    describe('playlists', () => {
        it('dispatches xTabSetPlaylists with the parsed array', () => {
            const playlists = [{ id: 'pl-1', name: 'Faves', videoIds: [], createdAt: '' }];

            fireStorageEvent(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));

            expect(dispatch).toHaveBeenCalledWith(
                playlistActions.xTabSetPlaylists(playlists),
            );
        });

        it('ignores non-array playlist data', () => {
            fireStorageEvent(STORAGE_KEYS.PLAYLISTS, JSON.stringify(null));

            const calls = (dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
                ([action]: [{ type: string }]) => action.type === 'playlist/xTabSetPlaylists',
            );
            expect(calls).toHaveLength(0);
        });
    });

    // ─── Subscription sync ────────────────────────────────────────────────────

    describe('subscriptions', () => {
        it('dispatches xTabSetSubscriptions with the parsed array', () => {
            fireStorageEvent(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(['ch-1', 'ch-2']));

            expect(dispatch).toHaveBeenCalledWith(
                subscriptionActions.xTabSetSubscriptions(expect.arrayContaining(['ch-1', 'ch-2'])),
            );
        });

        it('ignores non-array subscription data', () => {
            fireStorageEvent(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify('not-an-array'));

            const calls = (dispatch as ReturnType<typeof vi.fn>).mock.calls.filter(
                ([action]: [{ type: string }]) => action.type === 'subscription/xTabSetSubscriptions',
            );
            expect(calls).toHaveLength(0);
        });
    });

    // ─── Unrelated keys are ignored ───────────────────────────────────────────

    describe('unrelated storage events', () => {
        it('does not dispatch anything for an unknown key', () => {
            fireStorageEvent('some-random-key', 'some-value');

            expect(dispatch).not.toHaveBeenCalled();
        });

        it('does not dispatch anything for metube:sidebar-collapsed', () => {
            fireStorageEvent(STORAGE_KEYS.SIDEBAR_COLLAPSED, 'true');

            expect(dispatch).not.toHaveBeenCalled();
        });
    });

    // ─── Null newValue is ignored ─────────────────────────────────────────────

    describe('null newValue', () => {
        it('does not dispatch when newValue is null (key was removed)', () => {
            fireStorageEvent(STORAGE_KEYS.THEME_MODE, null);

            expect(dispatch).not.toHaveBeenCalled();
        });

        it('does not dispatch for WATCH_HISTORY when newValue is null', () => {
            fireStorageEvent(STORAGE_KEYS.WATCH_HISTORY, null);

            expect(dispatch).not.toHaveBeenCalled();
        });
    });

    // ─── Null event key ───────────────────────────────────────────────────────

    describe('null event key', () => {
        it('does not dispatch when event key is null (localStorage.clear() case)', () => {
            window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: 'some-value' }));

            expect(dispatch).not.toHaveBeenCalled();
        });
    });

    // ─── Two real stores, not a mocked dispatch ──────────────────────────────
    //
    // Every test above asserts that dispatch() was CALLED WITH the right action —
    // it never runs a real reducer, so a bug in xTabSetPlaylists itself (e.g.
    // merging instead of replacing) would still pass every one of them. This
    // wires a second real store to initCrossTabSync and checks its actual state
    // after the storage event, mirroring what two real browser tabs would show.

    describe('playlist edit converges across two real stores', () => {
        it('a playlist edit committed in tab A reaches tab B through the real reducer', () => {
            const storeA = configureStore({ reducer: { playlist: playlistSlice.reducer } });
            const storeB = configureStore({ reducer: { playlist: playlistSlice.reducer } });
            const cleanupB = initCrossTabSync(storeB.dispatch as AppDispatch);

            const edited: Playlist[] = [{ id: 'pl-1', name: 'Renamed by tab A', videoIds: [] } as Playlist];
            storeA.dispatch(playlistActions.setPlaylists(edited));

            // Mirrors what persistMiddleware's debounced effect eventually writes to
            // localStorage for the playlist slice — asserted directly here instead of
            // advancing the middleware's debounce timer, which has its own coverage.
            fireStorageEvent(STORAGE_KEYS.PLAYLISTS, JSON.stringify(storeA.getState().playlist.playlists));

            expect(storeB.getState().playlist.playlists).toEqual(edited);

            cleanupB();
        });
    });
});
