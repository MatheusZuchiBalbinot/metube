import { describe, it, expect } from 'vitest';
import { VideoFilter, SortBy } from '@utils/applyFilters';
import type { Video } from '@data/mockVideos';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeVideo(overrides: Partial<Video> = {}): Video {
    return {
        id: 'test-id',
        title: 'Test Video',
        description: '',
        tags: [],
        thumbnail: '',
        publishedAt: '2024-01-01T00:00:00Z',
        channel: 'TestChannel',
        channelId: 'ch_test',
        views: 0,
        status: 'published',
        ...overrides,
    };
}

const empty = VideoFilter.emptyState();

// ─── emptyState ───────────────────────────────────────────────────────────────

describe('VideoFilter.emptyState', () => {
    it('has empty tags', () => {
        expect(empty.tags).toEqual([]);
    });

    it('has null year and dates', () => {
        expect(empty.year).toBeNull();
        expect(empty.dateFrom).toBeNull();
        expect(empty.dateTo).toBeNull();
    });

    it('defaults to RECENT sort', () => {
        expect(empty.sortBy).toBe(SortBy.RECENT);
    });
});

// ─── apply — no filter ────────────────────────────────────────────────────────

describe('VideoFilter.apply — no filter', () => {
    it('returns all videos sorted by publishedAt descending by default', () => {
        const videos = [
            makeVideo({ id: 'a', publishedAt: '2024-01-01T00:00:00Z' }),
            makeVideo({ id: 'b', publishedAt: '2024-03-01T00:00:00Z' }),
            makeVideo({ id: 'c', publishedAt: '2024-02-01T00:00:00Z' }),
        ];
        const result = VideoFilter.apply(videos, empty);
        expect(result.map(v => v.id)).toEqual(['b', 'c', 'a']);
    });

    it('does not mutate the original array', () => {
        const videos = [makeVideo({ id: 'x' }), makeVideo({ id: 'y' })];
        VideoFilter.apply(videos, empty);
        expect(videos[0].id).toBe('x');
    });
});

// ─── apply — tag filter ───────────────────────────────────────────────────────

describe('VideoFilter.apply — tags', () => {
    it('keeps only videos that have ALL requested tags', () => {
        const videos = [
            makeVideo({ id: 'a', tags: ['react', 'typescript'] }),
            makeVideo({ id: 'b', tags: ['react'] }),
            makeVideo({ id: 'c', tags: ['typescript'] }),
        ];
        const result = VideoFilter.apply(videos, { ...empty, tags: ['react', 'typescript'] });
        expect(result.map(v => v.id)).toEqual(['a']);
    });

    it('returns all videos when tags filter is empty', () => {
        const videos = [makeVideo({ id: 'a' }), makeVideo({ id: 'b' })];
        const result = VideoFilter.apply(videos, { ...empty, tags: [] });
        expect(result).toHaveLength(2);
    });

    it('returns empty array when no video matches all tags', () => {
        const videos = [makeVideo({ tags: ['react'] }), makeVideo({ tags: ['css'] })];
        const result = VideoFilter.apply(videos, { ...empty, tags: ['react', 'css'] });
        expect(result).toHaveLength(0);
    });
});

// ─── apply — year filter ──────────────────────────────────────────────────────

describe('VideoFilter.apply — year', () => {
    it('keeps only videos published in the given year', () => {
        const videos = [
            makeVideo({ id: '2023', publishedAt: '2023-06-15T12:00:00Z' }),
            makeVideo({ id: '2024a', publishedAt: '2024-04-10T12:00:00Z' }),
            makeVideo({ id: '2024b', publishedAt: '2024-09-20T12:00:00Z' }),
        ];
        const result = VideoFilter.apply(videos, { ...empty, year: 2024 });
        expect(result.map(v => v.id)).toContain('2024a');
        expect(result.map(v => v.id)).toContain('2024b');
        expect(result.map(v => v.id)).not.toContain('2023');
    });
});

// ─── apply — dateFrom / dateTo ────────────────────────────────────────────────

describe('VideoFilter.apply — dateFrom / dateTo', () => {
    const videos = [
        makeVideo({ id: 'jan', publishedAt: '2024-01-15T00:00:00Z' }),
        makeVideo({ id: 'mar', publishedAt: '2024-03-10T00:00:00Z' }),
        makeVideo({ id: 'dec', publishedAt: '2024-12-20T00:00:00Z' }),
    ];

    it('filters by dateFrom (inclusive)', () => {
        const result = VideoFilter.apply(videos, { ...empty, dateFrom: '2024-03-10' });
        expect(result.map(v => v.id)).toContain('mar');
        expect(result.map(v => v.id)).toContain('dec');
        expect(result.map(v => v.id)).not.toContain('jan');
    });

    it('filters by dateTo (inclusive until end of day)', () => {
        const result = VideoFilter.apply(videos, { ...empty, dateTo: '2024-03-10' });
        expect(result.map(v => v.id)).toContain('jan');
        expect(result.map(v => v.id)).toContain('mar');
        expect(result.map(v => v.id)).not.toContain('dec');
    });

    it('filters by date range', () => {
        const result = VideoFilter.apply(videos, { ...empty, dateFrom: '2024-03-01', dateTo: '2024-06-01' });
        expect(result.map(v => v.id)).toEqual(['mar']);
    });
});

// ─── apply — sortBy ───────────────────────────────────────────────────────────

describe('VideoFilter.apply — sortBy', () => {
    const videos = [
        makeVideo({ id: 'b', title: 'Banana', views: 500, publishedAt: '2024-02-01T00:00:00Z' }),
        makeVideo({ id: 'a', title: 'Apple', views: 200, publishedAt: '2024-03-01T00:00:00Z' }),
        makeVideo({ id: 'c', title: 'Cherry', views: 900, publishedAt: '2024-01-01T00:00:00Z' }),
    ];

    it('sorts by views descending', () => {
        const result = VideoFilter.apply(videos, { ...empty, sortBy: SortBy.VIEWS });
        expect(result.map(v => v.id)).toEqual(['c', 'b', 'a']);
    });

    it('sorts alphabetically by title (A-Z)', () => {
        const result = VideoFilter.apply(videos, { ...empty, sortBy: SortBy.AZ });
        expect(result.map(v => v.id)).toEqual(['a', 'b', 'c']);
    });

    it('sorts by most recent first', () => {
        const result = VideoFilter.apply(videos, { ...empty, sortBy: SortBy.RECENT });
        expect(result.map(v => v.id)).toEqual(['a', 'b', 'c']);
    });
});
