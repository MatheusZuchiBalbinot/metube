// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { persistMiddleware } from '@store/persistMiddleware';
import { rootReducer } from '@store/reducers';
import { videoActions } from '@store/videoSlice';
import { themeActions } from '@store/themeSlice';
import { subscriptionActions } from '@store/subscriptionSlice';
import { playlistActions } from '@store/playlistSlice';
import { searchActions } from '@store/searchSlice';
import { STORAGE_KEYS } from '@utils/storageKeys';
import type { ChannelId } from '@models/channel';
import type { VideoId } from '@models/video';
import type { PlaylistId } from '@models/playlist';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStore() {
    return configureStore({
        reducer: rootReducer,
        middleware: (getDefault) => getDefault().concat(persistMiddleware.middleware),
    });
}

const vid = (s: string) => s as unknown as VideoId;
const chId = (s: string) => s as unknown as ChannelId;
const plId = (s: string) => s as unknown as PlaylistId;

/** Find the last setItem call for a given key. */
function lastCallFor(spy: ReturnType<typeof vi.spyOn>, key: string): [string, string] | undefined {
    const calls = spy.mock.calls.filter((c: unknown[]): c is [string, string] => c[0] === key);
    return calls[calls.length - 1];
}

/** Return all setItem calls for a given key. */
function allCallsFor(spy: ReturnType<typeof vi.spyOn>, key: string): [string, string][] {
    return spy.mock.calls.filter((c: unknown[]): c is [string, string] => c[0] === key);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('persistMiddleware', () => {
    let setItemSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // ─── Video persistence ─────────────────────────────────────────────────────

    describe('video slice', () => {
        it('persists watchHistory after video/watchVideo', async () => {
            const store = makeStore();

            store.dispatch(videoActions.watchVideo(vid('v1')));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.WATCH_HISTORY);
            expect(call).toBeDefined();
            const written = JSON.parse(call![1]);
            expect(written).toContain('v1');
        });

        it('persists likedVideos after video/likeVideo', async () => {
            const store = makeStore();

            store.dispatch(videoActions.likeVideo(vid('v2')));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.LIKED_VIDEOS);
            expect(call).toBeDefined();
            const written = JSON.parse(call![1]);
            expect(written).toContain('v2');
        });

        it('persists dislikedVideos after video/dislikeVideo', async () => {
            const store = makeStore();

            store.dispatch(videoActions.dislikeVideo(vid('v3')));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.DISLIKED_VIDEOS);
            expect(call).toBeDefined();
            const written = JSON.parse(call![1]);
            expect(written).toContain('v3');
        });

        it('persists autoplay after video/setAutoplay', async () => {
            const store = makeStore();

            store.dispatch(videoActions.setAutoplay(false));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.AUTOPLAY);
            expect(call).toBeDefined();
            expect(JSON.parse(call![1])).toBe(false);
        });

        it('persists shortsMuted after video/setShortsMuted', async () => {
            const store = makeStore();

            store.dispatch(videoActions.setShortsMuted(false));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.SHORTS_MUTED);
            expect(call).toBeDefined();
            expect(JSON.parse(call![1])).toBe(false);
        });

        it('persists shortsVolume as a raw numeric string after video/setShortsVolume', async () => {
            const store = makeStore();

            store.dispatch(videoActions.setShortsVolume(0.5));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.SHORTS_VOLUME);
            expect(call).toBeDefined();
            expect(call![1]).toBe('0.5');
        });

        it('persists pinnedVideo as a raw string after video/pinVideo', async () => {
            const store = makeStore();

            store.dispatch(videoActions.pinVideo(vid('v-pin')));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.PINNED_VIDEO);
            expect(call).toBeDefined();
            expect(call![1]).toBe('v-pin');
        });

        it('does NOT persist for xTab actions (video/xTabSetWatchHistory)', async () => {
            const store = makeStore();
            setItemSpy.mockClear();

            store.dispatch(videoActions.xTabSetWatchHistory([vid('v-xtab')]));
            await vi.runAllTimersAsync();

            expect(allCallsFor(setItemSpy, STORAGE_KEYS.WATCH_HISTORY)).toHaveLength(0);
        });
    });

    // ─── Theme persistence ─────────────────────────────────────────────────────

    describe('theme slice', () => {
        it('persists theme mode after theme/setMode', async () => {
            const store = makeStore();

            store.dispatch(themeActions.setMode('light'));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.THEME_MODE);
            expect(call).toBeDefined();
            expect(call![1]).toBe('light');
        });

        it('persists theme color after theme/setColor', async () => {
            const store = makeStore();

            store.dispatch(themeActions.setColor('blue'));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.THEME_COLOR);
            expect(call).toBeDefined();
            expect(call![1]).toBe('blue');
        });
    });

    // ─── Subscription persistence ──────────────────────────────────────────────

    describe('subscription slice', () => {
        it('persists subscribedChannelIds after subscription/toggleSubscription', async () => {
            const store = makeStore();
            setItemSpy.mockClear();

            store.dispatch(subscriptionActions.toggleSubscription(chId('ch-1')));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.SUBSCRIPTIONS);
            expect(call).toBeDefined();
            const written = JSON.parse(call![1]);
            expect(written).toContain('ch-1');
        });

        it('does NOT persist for subscription/xTabSetSubscriptions', async () => {
            const store = makeStore();
            setItemSpy.mockClear();

            store.dispatch(subscriptionActions.xTabSetSubscriptions([chId('ch-xtab')]));
            await vi.runAllTimersAsync();

            expect(allCallsFor(setItemSpy, STORAGE_KEYS.SUBSCRIPTIONS)).toHaveLength(0);
        });
    });

    // ─── Playlist persistence ──────────────────────────────────────────────────

    describe('playlist slice', () => {
        it('persists playlists after playlist/createPlaylist', async () => {
            const store = makeStore();
            setItemSpy.mockClear();

            store.dispatch(playlistActions.createPlaylist({ id: plId('pl-1'), name: 'Test' }));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.PLAYLISTS);
            expect(call).toBeDefined();
            const written = JSON.parse(call![1]) as Array<{ id: string }>;
            expect(written.some((p) => p.id === 'pl-1')).toBe(true);
        });

        it('persists playlists after video/deleteVideo (cascade)', async () => {
            const store = makeStore();
            setItemSpy.mockClear();

            store.dispatch(videoActions.deleteVideo(vid('v-del')));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.PLAYLISTS);
            expect(call).toBeDefined();
        });

        it('does NOT persist for playlist/xTabSetPlaylists', async () => {
            const store = makeStore();
            setItemSpy.mockClear();

            store.dispatch(playlistActions.xTabSetPlaylists([]));
            await vi.runAllTimersAsync();

            expect(allCallsFor(setItemSpy, STORAGE_KEYS.PLAYLISTS)).toHaveLength(0);
        });
    });

    // ─── Search persistence ────────────────────────────────────────────────────

    describe('search slice', () => {
        it('persists recentSearches after search/addRecentSearch', async () => {
            const store = makeStore();

            store.dispatch(searchActions.addRecentSearch('cats'));
            await vi.runAllTimersAsync();

            const call = lastCallFor(setItemSpy, STORAGE_KEYS.RECENT_SEARCHES);
            expect(call).toBeDefined();
            const written = JSON.parse(call![1]);
            expect(written).toContain('cats');
        });
    });

    // ─── Isolation — unrelated slices don't pollute each other ────────────────

    describe('isolation', () => {
        it('does not write WATCH_HISTORY when only theme changes', async () => {
            const store = makeStore();
            setItemSpy.mockClear();

            store.dispatch(themeActions.setMode('light'));
            await vi.runAllTimersAsync();

            expect(allCallsFor(setItemSpy, STORAGE_KEYS.WATCH_HISTORY)).toHaveLength(0);
        });

        it('does not write THEME_MODE when only a video action fires', async () => {
            const store = makeStore();
            setItemSpy.mockClear();

            store.dispatch(videoActions.setAutoplay(true));
            await vi.runAllTimersAsync();

            expect(allCallsFor(setItemSpy, STORAGE_KEYS.THEME_MODE)).toHaveLength(0);
        });
    });

    // ─── localStorage error handling ───────────────────────────────────────────

    describe('localStorage error handling', () => {
        it('does not throw when localStorage.setItem throws', () => {
            // Create the store first (uses localStorage.getItem during init, not setItem),
            // then replace setItem with a throwing implementation.
            const store = makeStore();
            setItemSpy.mockImplementation(() => {
                throw new DOMException('QuotaExceededError');
            });

            expect(() => {
                store.dispatch(videoActions.setAutoplay(false));
            }).not.toThrow();
        });
    });
});
