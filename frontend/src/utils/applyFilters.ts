import type { Video } from '@data/mockVideos';

export const SortBy = {
    RECENT: 'recent',
    VIEWS: 'views',
    AZ: 'az',
} as const;
export type SortBy = typeof SortBy[keyof typeof SortBy];

export interface FilterState {
    tags: string[]
    year: number | null
    dateFrom: string | null
    dateTo: string | null
    sortBy: SortBy
}

export class VideoFilter {
    static emptyState(): FilterState {
        return { tags: [], year: null, dateFrom: null, dateTo: null, sortBy: SortBy.RECENT };
    }

    static apply(videos: Video[], f: FilterState): Video[] {
        let result = [...videos];

        const hasTagFilter = f.tags.length > 0;
        if (hasTagFilter) {
            result = result.filter(v => f.tags.every(t => v.tags.includes(t)));
        }

        const hasYearFilter = f.year !== null;
        if (hasYearFilter) {
            result = result.filter(v => new Date(v.publishedAt).getFullYear() === f.year);
        }

        const hasDateFrom = f.dateFrom !== null;
        if (hasDateFrom) {
            result = result.filter(v => v.publishedAt >= f.dateFrom!);
        }

        const hasDateTo = f.dateTo !== null;
        if (hasDateTo) {
            result = result.filter(v => v.publishedAt <= `${f.dateTo!}T23:59:59Z`);
        }

        if (f.sortBy === SortBy.RECENT) {
            return result.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
        }

        if (f.sortBy === SortBy.VIEWS) {
            return result.sort((a, b) => b.views - a.views);
        }

        return result.sort((a, b) => a.title.localeCompare(b.title));
    }
}

