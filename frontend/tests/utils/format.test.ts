import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getVisibleTags, countTagFrequency, Format } from '@utils/format';
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

// ─── getVisibleTags ───────────────────────────────────────────────────────────

describe('getVisibleTags', () => {
    it('returns all tags when count is greater than tags length', () => {
        const result = getVisibleTags(['a', 'b'], 3);
        expect(result.visible).toEqual(['a', 'b']);
        expect(result.extra).toBe(0);
    });

    it('returns first N tags and correct extra count', () => {
        const result = getVisibleTags(['a', 'b', 'c', 'd', 'e'], 3);
        expect(result.visible).toEqual(['a', 'b', 'c']);
        expect(result.extra).toBe(2);
    });

    it('returns empty visible and 0 extra for empty array', () => {
        const result = getVisibleTags([]);
        expect(result.visible).toEqual([]);
        expect(result.extra).toBe(0);
    });

    it('uses default count of 3', () => {
        const result = getVisibleTags(['a', 'b', 'c', 'd']);
        expect(result.visible).toHaveLength(3);
        expect(result.extra).toBe(1);
    });

    it('extra is 0 when tags length equals count', () => {
        const result = getVisibleTags(['x', 'y', 'z'], 3);
        expect(result.extra).toBe(0);
    });
});

// ─── countTagFrequency ────────────────────────────────────────────────────────

describe('countTagFrequency', () => {
    it('returns empty object for no videos', () => {
        expect(countTagFrequency([])).toEqual({});
    });

    it('counts single tag across multiple videos', () => {
        const videos = [
            makeVideo({ tags: ['react'] }),
            makeVideo({ tags: ['react'] }),
            makeVideo({ tags: ['react'] }),
        ];
        expect(countTagFrequency(videos)).toEqual({ react: 3 });
    });

    it('counts multiple tags independently', () => {
        const videos = [
            makeVideo({ tags: ['react', 'typescript'] }),
            makeVideo({ tags: ['react', 'css'] }),
            makeVideo({ tags: ['typescript'] }),
        ];
        expect(countTagFrequency(videos)).toEqual({ react: 2, typescript: 2, css: 1 });
    });

    it('handles videos with no tags', () => {
        const videos = [makeVideo({ tags: [] }), makeVideo({ tags: ['go'] })];
        expect(countTagFrequency(videos)).toEqual({ go: 1 });
    });
});

// ─── Format.duration ─────────────────────────────────────────────────────────

describe('Format.duration', () => {
    it('formats seconds-only', () => {
        expect(Format.duration(45)).toBe('0:45');
    });

    it('formats minutes and seconds', () => {
        expect(Format.duration(125)).toBe('2:05');
    });

    it('pads single-digit seconds', () => {
        expect(Format.duration(60 + 3)).toBe('1:03');
    });

    it('formats hours, minutes and seconds', () => {
        expect(Format.duration(3661)).toBe('1:01:01');
    });

    it('pads minutes when hours present', () => {
        expect(Format.duration(3600 + 5 * 60 + 9)).toBe('1:05:09');
    });

    it('floors decimal seconds', () => {
        expect(Format.duration(59.9)).toBe('0:59');
    });

    it('formats 0 seconds', () => {
        expect(Format.duration(0)).toBe('0:00');
    });
});

// ─── Format.views ─────────────────────────────────────────────────────────────

describe('Format.views', () => {
    it('returns raw number for small values', () => {
        expect(Format.views(0)).toBe('0');
        expect(Format.views(999)).toBe('999');
    });

    it('formats thousands with K suffix', () => {
        expect(Format.views(1_000)).toBe('1.0K');
        expect(Format.views(1_500)).toBe('1.5K');
        expect(Format.views(999_999)).toBe('1000.0K');
    });

    it('formats millions with M suffix', () => {
        expect(Format.views(1_000_000)).toBe('1.0M');
        expect(Format.views(2_500_000)).toBe('2.5M');
    });
});

// ─── Format.relativeDate ─────────────────────────────────────────────────────

describe('Format.relativeDate', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns "now" / seconds ago for very recent dates', () => {
        const isoDate = new Date(Date.now() - 30_000).toISOString();
        const result = Format.relativeDate(isoDate, 'en');
        expect(result).toMatch(/second/i);
    });

    it('returns minutes ago', () => {
        const isoDate = new Date(Date.now() - 5 * 60_000).toISOString();
        const result = Format.relativeDate(isoDate, 'en');
        expect(result).toMatch(/minute/i);
    });

    it('returns hours ago', () => {
        const isoDate = new Date(Date.now() - 3 * 3600_000).toISOString();
        const result = Format.relativeDate(isoDate, 'en');
        expect(result).toMatch(/hour/i);
    });

    it('returns days ago', () => {
        const isoDate = new Date(Date.now() - 3 * 86400_000).toISOString();
        const result = Format.relativeDate(isoDate, 'en');
        expect(result).toMatch(/day/i);
    });

    it('returns weeks ago', () => {
        const isoDate = new Date(Date.now() - 14 * 86400_000).toISOString();
        const result = Format.relativeDate(isoDate, 'en');
        expect(result).toMatch(/week/i);
    });

    it('returns months ago', () => {
        const isoDate = new Date(Date.now() - 60 * 86400_000).toISOString();
        const result = Format.relativeDate(isoDate, 'en');
        expect(result).toMatch(/month/i);
    });

    it('returns years ago', () => {
        const isoDate = new Date(Date.now() - 400 * 86400_000).toISOString();
        const result = Format.relativeDate(isoDate, 'en');
        expect(result).toMatch(/year/i);
    });
});
