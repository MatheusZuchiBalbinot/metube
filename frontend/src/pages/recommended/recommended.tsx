import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import VideoCard from '@components/video/card';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import EmptyState from '@ui/empty/empty';
import { VideoFilter } from '@utils';
import { AnalyticsSource } from '@api';
import { useVideoData } from '@hooks';
import { useRecommendedFeed } from './hooks/useRecommendedFeed';
import './recommended.css';
import type { Tag } from '@models';

export default function RecommendedPage() {
    const { t } = useTranslation();
    useRecommendedFeed();
    const { recommendations, recommendationsLoading } = useVideoData();
    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());

    const allTags = useMemo(() => {
        const tagSet = new Set<Tag>();
        for (const video of recommendations) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }, [recommendations]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(recommendations, filters),
        [recommendations, filters],
    );

    const hasVideos = recommendations.length > 0;
    const hasResults = filteredVideos.length > 0;

    if (recommendationsLoading && !hasVideos) {
        return (
            <div className="recommended-page">
                <div className="recommended-page__grid">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="recommended-page">
            <div className="recommended-page__header">
                <h1 className="recommended-page__title">{t('nav.recommended')}</h1>
                {hasVideos && (
                    <p className="recommended-page__count">
                        {t('video.videos_count', { count: recommendations.length })}
                    </p>
                )}
            </div>

            {hasVideos && (
                <div className="recommended-page__filters">
                    <FilterPanel allTags={allTags} value={filters} onChange={setFilters} />
                </div>
            )}

            {!hasVideos && (
                <EmptyState
                    icon={<Compass size={40} strokeWidth={1.25} />}
                    title={t('nav.recommended')}
                    description={t('recommended.empty_text')}
                />
            )}
            {hasVideos && !hasResults && (
                <EmptyState
                    icon={<Compass size={40} strokeWidth={1.25} />}
                    title={t('video.no_results')}
                    description={t('video.filter_clear')}
                />
            )}
            {hasVideos && hasResults && (
                <div className="recommended-page__grid">
                    {filteredVideos.map((video, i) => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            index={i}
                            source={AnalyticsSource.RECOMMENDED}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
