import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import EmptyState from '@ui/empty/empty';
import { VideoFilter } from '@utils';
import './videoGridPage.css';
import type { Video, Tag } from '@models';

interface VideoGridPageProps {
    title: string;
    videos: Video[];
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    loading?: boolean;
    emptyIcon: React.ReactNode;
    emptyDescription: string;
    renderItem: (video: Video, index: number) => React.ReactNode;
}

// Shared shell for every video-grid page (loading / empty / filtered-empty / results) —
// the branching is the mutually-exclusive view states themselves, not incidental complexity.
// eslint-disable-next-line complexity
export default function VideoGridPage({
    title,
    videos,
    filters,
    onFiltersChange,
    loading = false,
    emptyIcon,
    emptyDescription,
    renderItem,
}: VideoGridPageProps) {
    const { t } = useTranslation();

    const allTags = useMemo(() => {
        const tagSet = new Set<Tag>();
        for (const video of videos) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }, [videos]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(videos, filters),
        [videos, filters],
    );

    const hasVideos = videos.length > 0;
    const hasResults = filteredVideos.length > 0;

    if (loading) {
        return (
            <div className="video-grid-page">
                <div className="video-grid-page__grid">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="video-grid-page">
            <div className="video-grid-page__header">
                <h1 className="video-grid-page__title">{title}</h1>
                {hasVideos && (
                    <p className="video-grid-page__count">
                        {t('video.videos_count', { count: videos.length })}
                    </p>
                )}
            </div>

            {hasVideos && (
                <div className="video-grid-page__filters">
                    <FilterPanel allTags={allTags} value={filters} onChange={onFiltersChange} />
                </div>
            )}

            {!hasVideos && (
                <EmptyState icon={emptyIcon} title={title} description={emptyDescription} />
            )}
            {hasVideos && !hasResults && (
                <EmptyState
                    icon={emptyIcon}
                    title={t('video.no_results')}
                    description={t('video.filter_clear')}
                />
            )}
            {hasVideos && hasResults && (
                <div className="video-grid-page__grid">
                    {filteredVideos.map((video, i) => renderItem(video, i))}
                </div>
            )}
        </div>
    );
}
