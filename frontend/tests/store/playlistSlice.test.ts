// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import playlistSlice, { playlistActions } from '@store/playlistSlice';
import { videoActions } from '@store/videoSlice';
import type { Playlist } from '@store/playlistSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reducer = playlistSlice.reducer;

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
    return {
        id: 'pl-test',
        name: 'Test Playlist',
        videoIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

function makeState(playlists: Playlist[] = []) {
    return { playlists, loading: false, error: null };
}

// ─── createPlaylist ───────────────────────────────────────────────────────────

describe('playlistSlice — createPlaylist', () => {
    it('adds a new playlist', () => {
        const state = makeState();
        const next = reducer(state, playlistActions.createPlaylist({ id: 'pl-1', name: 'My List' }));
        const isFound = next.playlists.some(p => p.id === 'pl-1');
        expect(isFound).toBe(true);
    });

    it('new playlist starts with empty videoIds', () => {
        const state = makeState();
        const next = reducer(state, playlistActions.createPlaylist({ id: 'pl-1', name: 'My List' }));
        const playlist = next.playlists.find(p => p.id === 'pl-1');
        expect(playlist?.videoIds).toEqual([]);
    });
});

// ─── renamePlaylist ───────────────────────────────────────────────────────────

describe('playlistSlice — renamePlaylist', () => {
    it('renames an existing playlist', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', name: 'Old Name' })]);
        const next = reducer(state, playlistActions.renamePlaylist({ id: 'pl-1', name: 'New Name' }));
        const playlist = next.playlists.find(p => p.id === 'pl-1');
        expect(playlist?.name).toBe('New Name');
    });

    it('does nothing when playlist not found', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', name: 'Unchanged' })]);
        const next = reducer(state, playlistActions.renamePlaylist({ id: 'pl-99', name: 'Ghost' }));
        expect(next.playlists[0].name).toBe('Unchanged');
    });
});

// ─── deletePlaylist ───────────────────────────────────────────────────────────

describe('playlistSlice — deletePlaylist', () => {
    it('removes the playlist', () => {
        const state = makeState([makePlaylist({ id: 'pl-1' }), makePlaylist({ id: 'pl-2' })]);
        const next = reducer(state, playlistActions.deletePlaylist('pl-1'));
        const isGone = !next.playlists.some(p => p.id === 'pl-1');
        expect(isGone).toBe(true);
        expect(next.playlists).toHaveLength(1);
    });

    it('does nothing when playlist not found', () => {
        const state = makeState([makePlaylist({ id: 'pl-1' })]);
        const next = reducer(state, playlistActions.deletePlaylist('pl-99'));
        expect(next.playlists).toHaveLength(1);
    });
});

// ─── addVideoToPlaylist ───────────────────────────────────────────────────────

describe('playlistSlice — addVideoToPlaylist', () => {
    it('adds a video to the playlist', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', videoIds: [] })]);
        const next = reducer(state, playlistActions.addVideoToPlaylist({ playlistId: 'pl-1', videoId: 'v1' }));
        expect(next.playlists[0].videoIds).toContain('v1');
    });

    it('does not add duplicates', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', videoIds: ['v1'] })]);
        const next = reducer(state, playlistActions.addVideoToPlaylist({ playlistId: 'pl-1', videoId: 'v1' }));
        expect(next.playlists[0].videoIds).toHaveLength(1);
    });

    it('does nothing when playlist not found', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', videoIds: [] })]);
        const next = reducer(state, playlistActions.addVideoToPlaylist({ playlistId: 'pl-99', videoId: 'v1' }));
        expect(next.playlists[0].videoIds).toHaveLength(0);
    });
});

// ─── removeVideoFromPlaylist ──────────────────────────────────────────────────

describe('playlistSlice — removeVideoFromPlaylist', () => {
    it('removes a video from the playlist', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', videoIds: ['v1', 'v2'] })]);
        const next = reducer(state, playlistActions.removeVideoFromPlaylist({ playlistId: 'pl-1', videoId: 'v1' }));
        expect(next.playlists[0].videoIds).toEqual(['v2']);
    });

    it('is a no-op when video not in playlist', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', videoIds: ['v2'] })]);
        const next = reducer(state, playlistActions.removeVideoFromPlaylist({ playlistId: 'pl-1', videoId: 'v1' }));
        expect(next.playlists[0].videoIds).toEqual(['v2']);
    });
});

// ─── reorderVideosInPlaylist ──────────────────────────────────────────────────

describe('playlistSlice — reorderVideosInPlaylist', () => {
    it('replaces videoIds with the new order', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', videoIds: ['v1', 'v2', 'v3'] })]);
        const next = reducer(state, playlistActions.reorderVideosInPlaylist({ playlistId: 'pl-1', videoIds: ['v3', 'v1', 'v2'] }));
        expect(next.playlists[0].videoIds).toEqual(['v3', 'v1', 'v2']);
    });
});

// ─── extraReducers — videoActions.deleteVideo ─────────────────────────────────

describe('playlistSlice — extraReducers (videoActions.deleteVideo)', () => {
    it('removes deleted video from all playlists', () => {
        const state = makeState([
            makePlaylist({ id: 'pl-1', videoIds: ['v1', 'v2'] }),
            makePlaylist({ id: 'pl-2', videoIds: ['v1', 'v3'] }),
        ]);
        const next = reducer(state, videoActions.deleteVideo('v1'));
        expect(next.playlists[0].videoIds).toEqual(['v2']);
        expect(next.playlists[1].videoIds).toEqual(['v3']);
    });

    it('leaves playlists without the video untouched', () => {
        const state = makeState([makePlaylist({ id: 'pl-1', videoIds: ['v2', 'v3'] })]);
        const next = reducer(state, videoActions.deleteVideo('v1'));
        expect(next.playlists[0].videoIds).toEqual(['v2', 'v3']);
    });
});
