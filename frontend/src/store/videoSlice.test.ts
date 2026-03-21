// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import videoSlice, { videoActions } from './videoSlice';
import type { Video } from '@data/mockVideos';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reducer = videoSlice.reducer;

function makeVideo(overrides: Partial<Video> = {}): Video {
    return {
        id: 'v-test',
        title: 'Test',
        description: '',
        tags: [],
        thumbnail: '',
        publishedAt: '2024-01-01T00:00:00Z',
        channel: 'Ch',
        channelId: 'ch_1',
        views: 0,
        status: 'published',
        ...overrides,
    };
}

function makeState(overrides: object = {}) {
    return {
        videos: [makeVideo({ id: 'v1' }), makeVideo({ id: 'v2' })],
        watchHistory: [],
        likedVideos: [],
        dislikedVideos: [],
        savedVideos: [],
        videoProgress: {},
        autoplay: true,
        uploadModalOpen: false,
        activeTagView: null,
        miniPlayer: null,
        pendingVideoSeek: null,
        watchEvents: [],
        pinnedVideoId: null,
        theaterMode: false,
        shortsMuted: true,
        shortsVolume: 0.8,
        loading: false,
        error: null,
        ...overrides,
    };
}

// ─── deleteVideo ──────────────────────────────────────────────────────────────

describe('videoSlice — deleteVideo', () => {
    it('removes the video from the list', () => {
        const state = makeState();
        const next = reducer(state, videoActions.deleteVideo('v1'));
        expect(next.videos.find(v => v.id === 'v1')).toBeUndefined();
        expect(next.videos.find(v => v.id === 'v2')).toBeDefined();
    });

    it('cleans up from watchHistory, liked, disliked, saved', () => {
        const state = makeState({
            watchHistory: ['v1', 'v2'],
            likedVideos: ['v1'],
            dislikedVideos: ['v1'],
            savedVideos: ['v1'],
        });
        const next = reducer(state, videoActions.deleteVideo('v1'));
        expect(next.watchHistory).toEqual(['v2']);
        expect(next.likedVideos).toEqual([]);
        expect(next.dislikedVideos).toEqual([]);
        expect(next.savedVideos).toEqual([]);
    });

    it('clears pinnedVideoId when deleting pinned video', () => {
        const state = makeState({ pinnedVideoId: 'v1' });
        const next = reducer(state, videoActions.deleteVideo('v1'));
        expect(next.pinnedVideoId).toBeNull();
    });

    it('does not clear pinnedVideoId for a different video', () => {
        const state = makeState({ pinnedVideoId: 'v2' });
        const next = reducer(state, videoActions.deleteVideo('v1'));
        expect(next.pinnedVideoId).toBe('v2');
    });
});

// ─── likeVideo ────────────────────────────────────────────────────────────────

describe('videoSlice — likeVideo', () => {
    it('adds video to likedVideos', () => {
        const state = makeState();
        const next = reducer(state, videoActions.likeVideo('v1'));
        expect(next.likedVideos).toContain('v1');
    });

    it('removes from dislikedVideos when liked', () => {
        const state = makeState({ dislikedVideos: ['v1'] });
        const next = reducer(state, videoActions.likeVideo('v1'));
        expect(next.dislikedVideos).not.toContain('v1');
    });

    it('toggles off when already liked', () => {
        const state = makeState({ likedVideos: ['v1'] });
        const next = reducer(state, videoActions.likeVideo('v1'));
        expect(next.likedVideos).not.toContain('v1');
    });
});

// ─── dislikeVideo ─────────────────────────────────────────────────────────────

describe('videoSlice — dislikeVideo', () => {
    it('adds video to dislikedVideos', () => {
        const state = makeState();
        const next = reducer(state, videoActions.dislikeVideo('v1'));
        expect(next.dislikedVideos).toContain('v1');
    });

    it('removes from likedVideos when disliked', () => {
        const state = makeState({ likedVideos: ['v1'] });
        const next = reducer(state, videoActions.dislikeVideo('v1'));
        expect(next.likedVideos).not.toContain('v1');
    });

    it('toggles off when already disliked', () => {
        const state = makeState({ dislikedVideos: ['v1'] });
        const next = reducer(state, videoActions.dislikeVideo('v1'));
        expect(next.dislikedVideos).not.toContain('v1');
    });
});

// ─── saveVideo ────────────────────────────────────────────────────────────────

describe('videoSlice — saveVideo', () => {
    it('adds video to savedVideos', () => {
        const state = makeState();
        const next = reducer(state, videoActions.saveVideo('v1'));
        expect(next.savedVideos).toContain('v1');
    });

    it('removes video from savedVideos when already saved', () => {
        const state = makeState({ savedVideos: ['v1'] });
        const next = reducer(state, videoActions.saveVideo('v1'));
        expect(next.savedVideos).not.toContain('v1');
    });
});

// ─── watchVideo ───────────────────────────────────────────────────────────────

describe('videoSlice — watchVideo', () => {
    it('adds video to the front of watchHistory', () => {
        const state = makeState({ watchHistory: ['v2'] });
        const next = reducer(state, videoActions.watchVideo('v1'));
        expect(next.watchHistory[0]).toBe('v1');
    });

    it('moves existing entry to front (deduplicates)', () => {
        const state = makeState({ watchHistory: ['v2', 'v1'] });
        const next = reducer(state, videoActions.watchVideo('v1'));
        expect(next.watchHistory).toEqual(['v1', 'v2']);
    });

    it('records a watch event', () => {
        const state = makeState();
        const next = reducer(state, videoActions.watchVideo('v1'));
        const hasEvent = next.watchEvents.some(e => e.videoId === 'v1');
        expect(hasEvent).toBe(true);
    });

    it('does not overwrite existing progress', () => {
        const state = makeState({ videoProgress: { v1: 55 } });
        const next = reducer(state, videoActions.watchVideo('v1'));
        expect(next.videoProgress['v1']).toBe(55);
    });

    it('sets initial progress of 10 for first watch', () => {
        const state = makeState();
        const next = reducer(state, videoActions.watchVideo('v1'));
        expect(next.videoProgress['v1']).toBe(10);
    });
});

// ─── pinVideo ─────────────────────────────────────────────────────────────────

describe('videoSlice — pinVideo', () => {
    it('sets pinnedVideoId', () => {
        const state = makeState();
        const next = reducer(state, videoActions.pinVideo('v1'));
        expect(next.pinnedVideoId).toBe('v1');
    });

    it('unpins when the same video is pinned again', () => {
        const state = makeState({ pinnedVideoId: 'v1' });
        const next = reducer(state, videoActions.pinVideo('v1'));
        expect(next.pinnedVideoId).toBeNull();
    });

    it('replaces pinned video', () => {
        const state = makeState({ pinnedVideoId: 'v1' });
        const next = reducer(state, videoActions.pinVideo('v2'));
        expect(next.pinnedVideoId).toBe('v2');
    });
});

// ─── updateProgress ──────────────────────────────────────────────────────────

describe('videoSlice — updateProgress', () => {
    it('stores the progress percentage', () => {
        const state = makeState();
        const next = reducer(state, videoActions.updateProgress({ videoId: 'v1', percent: 72 }));
        expect(next.videoProgress['v1']).toBe(72);
    });

    it('overwrites existing progress', () => {
        const state = makeState({ videoProgress: { v1: 20 } });
        const next = reducer(state, videoActions.updateProgress({ videoId: 'v1', percent: 80 }));
        expect(next.videoProgress['v1']).toBe(80);
    });
});
