import { describe, it, expect } from 'vitest';
import { domain } from '@domain';
import { PLAYLIST_CONSTANTS, type Playlist, type VideoId } from '@models';


const vid = (s: string) => s as unknown as VideoId;

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
    return {
        id: 'p-1' as unknown as Playlist['id'],
        name: 'My Playlist',
        videoIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

describe('domain.playlist.isWatchLater', () => {
    it('returns true for the Watch Later playlist', () => {
        const p = makePlaylist({ name: PLAYLIST_CONSTANTS.WATCH_LATER });
        expect(domain.playlist.isWatchLater(p)).toBe(true);
    });

    it('returns false for a regular playlist', () => {
        expect(domain.playlist.isWatchLater(makePlaylist({ name: 'Favorites' }))).toBe(false);
    });

    it('returns false for an empty name', () => {
        expect(domain.playlist.isWatchLater(makePlaylist({ name: '' }))).toBe(false);
    });

    it('is case-sensitive', () => {
        expect(domain.playlist.isWatchLater(makePlaylist({ name: 'watch later' }))).toBe(false);
        expect(domain.playlist.isWatchLater(makePlaylist({ name: 'WATCH LATER' }))).toBe(false);
    });
});

describe('domain.playlist.containsVideo', () => {
    it('returns true when the playlist contains the video', () => {
        const p = makePlaylist({ videoIds: [vid('v-1'), vid('v-2')] });
        expect(domain.playlist.containsVideo(p, vid('v-1'))).toBe(true);
        expect(domain.playlist.containsVideo(p, vid('v-2'))).toBe(true);
    });

    it('returns false when the playlist does not contain the video', () => {
        const p = makePlaylist({ videoIds: [vid('v-1')] });
        expect(domain.playlist.containsVideo(p, vid('v-99'))).toBe(false);
    });

    it('returns false for an empty playlist', () => {
        const p = makePlaylist({ videoIds: [] });
        expect(domain.playlist.containsVideo(p, vid('v-1'))).toBe(false);
    });
});
