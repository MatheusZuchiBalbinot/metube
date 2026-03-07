import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import type { FilterState } from '@components/filter/panel';
import { useVideo } from '@context/useVideo';
import { VideoFilter } from '@utils/applyFilters';
import './home.css';

export default function HomePage() {
    const { t } = useTranslation();
    const { getRecommendations, getPublishedVideos } = useVideo();
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);

    const recommendations = useMemo(
        () => getRecommendations(200),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [getPublishedVideos],
    );

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const v of recommendations) {
            for (const tag of v.tags) { tagSet.add(tag); }
        }

        return Array.from(tagSet).sort();
    }, [recommendations]);

    const visibleVideos = useMemo(
        () => VideoFilter.apply(recommendations, filterState),
        [recommendations, filterState],
    );

    const hasResults = visibleVideos.length > 0;

    return (
        <div className="home-page">

            <div className="home-page__filters">
                <FilterPanel
                    allTags={allTags}
                    value={filterState}
                    onChange={setFilterState}
                />
            </div>

            <main className="home-page__main">
                {hasResults ? (
                    <div className="home-page__grid">
                        {visibleVideos.map(video => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                ) : (
                    <div className="home-page__empty">
                        <p className="home-page__empty-text">{t('video.no_results')}</p>
                    </div>
                )}
            </main>
        </div>
    );
}
