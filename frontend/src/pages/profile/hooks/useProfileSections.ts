import { useMemo } from 'react';
import { domain } from '@domain';
import { VideoFilter } from '@utils';
import type { Video, Tag } from '@models';
import type { FilterState } from '@components/filter/panel';

const MIN_VIDEOS_FOR_CURATED_LAYOUT = 5;

export interface TagSection {
    tag: Tag
    count: number
    videos: Video[]
}

export interface ProfileSectionsData {
    featured: Video | null
    latest: Video[]
    mostViewed: Video[]
    tagSections: TagSection[]
}

// Counts every tag across the published videos, excluding "shorts" (not a real topic).
function countPublishedTags(published: Video[]): Map<Tag, number> {
    const tagCounts = new Map<Tag, number>();

    for (const video of published) {
        for (const tag of video.tags) {
            const isShorts = tag === 'shorts';
            if (!isShorts) {
                tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
        }
    }

    return tagCounts;
}

// Top 4 tags with at least 2 videos each, with their 3 most-viewed videos.
function buildTagSections(published: Video[]): TagSection[] {
    const tagCounts = countPublishedTags(published);

    return [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .filter(([, count]) => count >= 2)
        .map(([tag, count]) => ({
            tag,
            count,
            videos: published
                .filter(v => v.tags.includes(tag))
                .sort((a, b) => b.views - a.views)
                .slice(0, 3),
        }));
}

export function useProfileSections(
    ownVideos: Video[],
    filterState: FilterState,
    pinnedVideo: Video | null,
): ProfileSectionsData | null {
    return useMemo(() => {
        const isFiltered = !VideoFilter.isEmpty(filterState);
        const published = ownVideos.filter(v => domain.video.isPublished(v));
        const hasEnough = published.length >= MIN_VIDEOS_FOR_CURATED_LAYOUT;

        if (isFiltered || !hasEnough) {
            return null;
        }

        const featured = pinnedVideo
            ?? [...published].sort((a, b) => b.views - a.views)[0]
            ?? null;

        const latest = [...published]
            .sort((a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime())
            .filter(v => v.id !== featured?.id)
            .slice(0, 5);

        const mostViewed = [...published]
            .sort((a, b) => b.views - a.views)
            .filter(v => v.id !== featured?.id)
            .slice(0, 6);

        const tagSections = buildTagSections(published);

        return { featured, latest, mostViewed, tagSections };
    }, [ownVideos, filterState, pinnedVideo]);
}
