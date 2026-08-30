import { describe, it, expect } from 'vitest';
import { getVisibleTags, countTagFrequency, collectTags, Format } from '@utils/format';
import type { Video } from '@models/video';

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
    it('returns empty map for no videos', () => {
        expect(countTagFrequency([])).toEqual(new Map());
    });

    it('counts single tag across multiple videos', () => {
        const videos = [
            makeVideo({ tags: ['react'] }),
            makeVideo({ tags: ['react'] }),
            makeVideo({ tags: ['react'] }),
        ];
        expect(countTagFrequency(videos)).toEqual(new Map([['react', 3]]));
    });

    it('counts multiple tags independently', () => {
        const videos = [
            makeVideo({ tags: ['react', 'typescript'] }),
            makeVideo({ tags: ['react', 'css'] }),
            makeVideo({ tags: ['typescript'] }),
        ];
        const result = countTagFrequency(videos);
        expect(result.get('react')).toBe(2);
        expect(result.get('typescript')).toBe(2);
        expect(result.get('css')).toBe(1);
    });

    it('handles videos with no tags', () => {
        const videos = [makeVideo({ tags: [] }), makeVideo({ tags: ['go'] })];
        expect(countTagFrequency(videos)).toEqual(new Map([['go', 1]]));
    });
});

// ─── collectTags ──────────────────────────────────────────────────────────────

describe('collectTags', () => {
    it('returns empty array for no videos', () => {
        expect(collectTags([])).toEqual([]);
    });

    it('deduplicates tags across videos', () => {
        const videos = [
            makeVideo({ tags: ['react', 'typescript'] }),
            makeVideo({ tags: ['react', 'css'] }),
        ];
        expect(collectTags(videos)).toEqual(['css', 'react', 'typescript']);
    });

    it('sorts tags alphabetically', () => {
        const videos = [makeVideo({ tags: ['zebra', 'apple', 'mango'] })];
        expect(collectTags(videos)).toEqual(['apple', 'mango', 'zebra']);
    });

    it('handles videos with no tags', () => {
        const videos = [makeVideo({ tags: [] }), makeVideo({ tags: ['go'] })];
        expect(collectTags(videos)).toEqual(['go']);
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

describe('Format.bytes', () => {
    it('formats bytes', () => {
        expect(Format.bytes(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
        expect(Format.bytes(2048)).toBe('2 KB');
    });

    it('formats megabytes', () => {
        expect(Format.bytes(2_097_152)).toBe('2.0 MB');
    });

    it('formats gigabytes', () => {
        expect(Format.bytes(2_147_483_648)).toBe('2.0 GB');
    });
});

describe('Format.speed', () => {
    it('appends /s to bytes format', () => {
        expect(Format.speed(1024)).toBe('1 KB/s');
    });
});

describe('Format.percent', () => {
    it('rounds and appends %', () => {
        expect(Format.percent(42.6)).toBe('43%');
        expect(Format.percent(0)).toBe('0%');
        expect(Format.percent(100)).toBe('100%');
    });
});

describe('Format.truncate', () => {
    it('returns text unchanged when within max', () => {
        expect(Format.truncate('hello', 10)).toBe('hello');
    });

    it('truncates and appends ... when over max', () => {
        expect(Format.truncate('hello world', 8)).toBe('hello...');
    });
});
