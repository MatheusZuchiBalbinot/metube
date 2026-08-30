// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfileSections } from '@pages/profile/hooks/useProfileSections';
import { makeVideo, vid, tag } from '../../../helpers/factories';
import { VideoStatus } from '@models/video';
import { VideoFilter, SortBy } from '@utils';
import type { FilterState } from '@utils';

const emptyFilter: FilterState = VideoFilter.emptyState();

function published(overrides: Partial<Parameters<typeof makeVideo>[0]> = {}) {
    return makeVideo({ status: VideoStatus.PUBLISHED, ...overrides });
}

describe('useProfileSections', () => {
    it('returns null when there are fewer than 5 published videos', () => {
        const videos = [
            published({ id: vid('v1') }),
            published({ id: vid('v2') }),
        ];
        const { result } = renderHook(() => useProfileSections(videos, emptyFilter, null));

        expect(result.current).toBeNull();
    });

    it('returns null when a filter is active, even with enough videos', () => {
        const videos = Array.from({ length: 6 }, (_, i) => published({ id: vid(`v${i}`) }));
        const activeFilter: FilterState = { ...VideoFilter.emptyState(), sortBy: SortBy.VIEWS };

        const { result } = renderHook(() => useProfileSections(videos, activeFilter, null));

        expect(result.current).toBeNull();
    });

    it('builds curated sections once there are enough published videos', () => {
        const videos = [
            published({ id: vid('v1'), views: 500, tags: [tag('react')] }),
            published({ id: vid('v2'), views: 900, tags: [tag('react')] }),
            published({ id: vid('v3'), views: 100, tags: [tag('css')] }),
            published({ id: vid('v4'), views: 300, tags: [tag('css')] }),
            published({ id: vid('v5'), views: 700, tags: [tag('shorts')] }),
        ];

        const { result } = renderHook(() => useProfileSections(videos, emptyFilter, null));

        expect(result.current).not.toBeNull();
        // Featured defaults to the most-viewed video when no pinned video is given.
        expect(result.current?.featured?.id).toBe(vid('v2'));
        expect(result.current?.latest).toHaveLength(4);
        expect(result.current?.mostViewed).toHaveLength(4);
    });

    it('prefers the pinned video as featured over the most-viewed one', () => {
        const videos = [
            published({ id: vid('v1'), views: 500 }),
            published({ id: vid('v2'), views: 900 }),
            published({ id: vid('v3'), views: 100 }),
            published({ id: vid('v4'), views: 300 }),
            published({ id: vid('v5'), views: 700 }),
        ];
        const pinned = videos[0];

        const { result } = renderHook(() => useProfileSections(videos, emptyFilter, pinned));

        expect(result.current?.featured?.id).toBe(vid('v1'));
    });

    it('excludes the "shorts" tag and tags with fewer than 2 videos from tagSections', () => {
        const videos = [
            published({ id: vid('v1'), tags: [tag('react')] }),
            published({ id: vid('v2'), tags: [tag('react')] }),
            published({ id: vid('v3'), tags: [tag('shorts')] }),
            published({ id: vid('v4'), tags: [tag('shorts')] }),
            published({ id: vid('v5'), tags: [tag('once')] }),
        ];

        const { result } = renderHook(() => useProfileSections(videos, emptyFilter, null));

        const tags = result.current?.tagSections.map(s => s.tag) ?? [];
        expect(tags).toContain(tag('react'));
        expect(tags).not.toContain(tag('shorts'));
        expect(tags).not.toContain(tag('once'));
    });

    it('ignores unpublished videos when counting toward the curated-layout threshold', () => {
        const videos = [
            published({ id: vid('v1') }),
            published({ id: vid('v2') }),
            makeVideo({ id: vid('v3'), status: VideoStatus.DRAFT }),
            makeVideo({ id: vid('v4'), status: VideoStatus.DRAFT }),
            makeVideo({ id: vid('v5'), status: VideoStatus.DRAFT }),
        ];

        const { result } = renderHook(() => useProfileSections(videos, emptyFilter, null));

        expect(result.current).toBeNull();
    });
});
