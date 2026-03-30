// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    selectHistoryTags,
    selectPublishedVideos,
    selectLikedSet,
    selectDislikedSet,
    selectSavedSet,
    makeSelectRecommendations,
} from '@store/videoSlice';
import type { Video, VideoId } from '@data/mockVideos';
import { VideoStatus } from '@data/mockVideos';

// ─── Brand cast helpers ───────────────────────────────────────────────────────

const vid = (s: string) => s as unknown as VideoId;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeVideo(overrides: Partial<Video> = {}): Video {
    return {
        id: vid('v-test'),
        title: 'Test',
        description: '',
        tags: [],
        thumbnail: '',
        publishedAt: '2024-01-01T00:00:00Z',
        channel: 'Ch',
        channelId: 'ch_1' as unknown as Video['channelId'],
        views: 0,
        status: VideoStatus.PUBLISHED,
        ...overrides,
    };
}

function makeState(overrides: object = {}) {
    return {
        video: {
            videos: [] as Video[],
            watchHistory: [] as VideoId[],
            likedVideos: [] as VideoId[],
            dislikedVideos: [] as VideoId[],
            savedVideos: [] as VideoId[],
            videoProgress: {} as Record<string, number>,
            autoplay: true,
            uploadModalOpen: false,
            activeTagView: null,
            miniPlayer: null,
            pendingVideoSeek: null,
            watchEvents: [],
            pinnedVideoId: null as VideoId | null,
            theaterMode: false,
            shortsMuted: true,
            shortsVolume: 0.8,
            loading: false,
            error: null,
            ...overrides,
        },
    };
}

// ─── selectHistoryTags ────────────────────────────────────────────────────────

describe('selectHistoryTags', () => {
    it('returns tags from watched videos', () => {
        const state = makeState({
            videos: [makeVideo({ id: vid('v1'), tags: ['react', 'typescript'] as unknown as Video['tags'] })],
            watchHistory: [vid('v1')],
        });
        const result = selectHistoryTags(state);
        expect(result).toContain('react');
        expect(result).toContain('typescript');
    });

    it('does not include tags from unwatched videos', () => {
        const state = makeState({
            videos: [
                makeVideo({ id: vid('v1'), tags: ['react'] as unknown as Video['tags'] }),
                makeVideo({ id: vid('v2'), tags: ['css'] as unknown as Video['tags'] }),
            ],
            watchHistory: [vid('v1')],
        });
        const result = selectHistoryTags(state);
        expect(result).not.toContain('css');
    });

    it('deduplicates tags across multiple watched videos', () => {
        const state = makeState({
            videos: [
                makeVideo({ id: vid('v1'), tags: ['react'] as unknown as Video['tags'] }),
                makeVideo({ id: vid('v2'), tags: ['react', 'css'] as unknown as Video['tags'] }),
            ],
            watchHistory: [vid('v1'), vid('v2')],
        });
        const result = selectHistoryTags(state);
        const reactCount = result.filter(t => t === 'react').length;
        expect(reactCount).toBe(1);
    });

    it('returns empty array when nothing has been watched', () => {
        const state = makeState({ videos: [makeVideo()], watchHistory: [] });
        expect(selectHistoryTags(state)).toEqual([]);
    });
});

// ─── selectPublishedVideos ────────────────────────────────────────────────────

describe('selectPublishedVideos', () => {
    it('includes published videos', () => {
        const v = makeVideo({ id: vid('v1'), status: VideoStatus.PUBLISHED });
        const state = makeState({ videos: [v] });
        expect(selectPublishedVideos(state).map(x => x.id)).toContain(vid('v1'));
    });

    it('excludes draft videos', () => {
        const v = makeVideo({ id: vid('v1'), status: VideoStatus.DRAFT });
        const state = makeState({ videos: [v] });
        expect(selectPublishedVideos(state)).toHaveLength(0);
    });

    it('includes scheduled videos whose scheduledAt is in the past', () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));

        const v = makeVideo({
            id: vid('v1'),
            status: VideoStatus.SCHEDULED,
            scheduledAt: '2024-05-01T00:00:00Z',
        });
        const state = makeState({ videos: [v] });
        expect(selectPublishedVideos(state).map(x => x.id)).toContain(vid('v1'));
        vi.useRealTimers();
    });

    it('excludes scheduled videos whose scheduledAt is in the future', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        const v = makeVideo({
            id: vid('v1'),
            status: VideoStatus.SCHEDULED,
            scheduledAt: '2025-01-01T00:00:00Z',
        });
        const state = makeState({ videos: [v] });
        expect(selectPublishedVideos(state)).toHaveLength(0);
        vi.useRealTimers();
    });

    it('excludes scheduled videos with no scheduledAt', () => {
        const v = makeVideo({ id: vid('v1'), status: VideoStatus.SCHEDULED });
        const state = makeState({ videos: [v] });
        expect(selectPublishedVideos(state)).toHaveLength(0);
    });
});

// ─── selectLikedSet / selectDislikedSet / selectSavedSet ──────────────────────

describe('selectLikedSet', () => {
    it('returns a Set of liked video ids', () => {
        const state = makeState({ likedVideos: [vid('v1'), vid('v2')] });
        const result = selectLikedSet(state);
        expect(result.has(vid('v1'))).toBe(true);
        expect(result.has(vid('v2'))).toBe(true);
        expect(result.has(vid('v3'))).toBe(false);
    });

    it('returns an empty Set when no videos are liked', () => {
        const state = makeState({ likedVideos: [] });
        expect(selectLikedSet(state).size).toBe(0);
    });
});

describe('selectDislikedSet', () => {
    it('returns a Set of disliked video ids', () => {
        const state = makeState({ dislikedVideos: [vid('v1')] });
        expect(selectDislikedSet(state).has(vid('v1'))).toBe(true);
    });
});

describe('selectSavedSet', () => {
    it('returns a Set of saved video ids', () => {
        const state = makeState({ savedVideos: [vid('v1')] });
        expect(selectSavedSet(state).has(vid('v1'))).toBe(true);
    });
});

// ─── makeSelectRecommendations ────────────────────────────────────────────────

describe('makeSelectRecommendations', () => {
    it('sorts by views when there is no watch history', () => {
        const state = makeState({
            videos: [
                makeVideo({ id: vid('v1'), views: 100, status: VideoStatus.PUBLISHED }),
                makeVideo({ id: vid('v2'), views: 900, status: VideoStatus.PUBLISHED }),
                makeVideo({ id: vid('v3'), views: 300, status: VideoStatus.PUBLISHED }),
            ],
            watchHistory: [],
        });
        const select = makeSelectRecommendations(10);
        const result = select(state);
        expect(result[0].id).toBe(vid('v2'));
        expect(result[1].id).toBe(vid('v3'));
        expect(result[2].id).toBe(vid('v1'));
    });

    it('respects the limit', () => {
        const state = makeState({
            videos: Array.from({ length: 10 }, (_, i) =>
                makeVideo({ id: vid(`v${i}`), status: VideoStatus.PUBLISHED }),
            ),
            watchHistory: [],
        });
        const select = makeSelectRecommendations(3);
        expect(select(state)).toHaveLength(3);
    });

    it('ranks videos with matching history tags higher', () => {
        const state = makeState({
            videos: [
                makeVideo({ id: vid('match'), views: 10, tags: ['react'] as unknown as Video['tags'], status: VideoStatus.PUBLISHED }),
                makeVideo({ id: vid('no-match'), views: 10, tags: ['css'] as unknown as Video['tags'], status: VideoStatus.PUBLISHED }),
            ],
            watchHistory: [vid('watched')],
            // watched video has react tag — make a video in the list with it
        });
        // Add the watched video that carries the 'react' tag
        state.video.videos.push(
            makeVideo({ id: vid('watched'), tags: ['react'] as unknown as Video['tags'], status: VideoStatus.PUBLISHED }),
        );
        state.video.watchHistory = [vid('watched')];

        const select = makeSelectRecommendations(10);
        const result = select(state);
        const ids = result.map(v => v.id);
        expect(ids.indexOf(vid('match'))).toBeLessThan(ids.indexOf(vid('no-match')));
    });

    it('only includes published videos', () => {
        const state = makeState({
            videos: [
                makeVideo({ id: vid('pub'), status: VideoStatus.PUBLISHED }),
                makeVideo({ id: vid('draft'), status: VideoStatus.DRAFT }),
            ],
            watchHistory: [],
        });
        const select = makeSelectRecommendations(10);
        const ids = select(state).map(v => v.id);
        expect(ids).toContain(vid('pub'));
        expect(ids).not.toContain(vid('draft'));
    });
});
