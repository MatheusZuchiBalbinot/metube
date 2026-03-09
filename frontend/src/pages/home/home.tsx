import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Flame, Shuffle } from 'lucide-react';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import type { FilterState } from '@components/filter/panel';
import { useVideo } from '@context/useVideo';
import { VideoFilter } from '@utils/applyFilters';
import { ROUTES } from '@utils/routes';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import './home.css';

const TRENDING_WINDOW_DAYS = 730;
const TRENDING_COUNT = 8;
const CONTINUE_WATCHING_MIN_PROGRESS = 4;
const CONTINUE_WATCHING_MAX_PROGRESS = 96;
const GRID_ROWS_BEFORE_INTERSTITIAL = 8; // ~2 rows at typical viewport width

export default function HomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { recommendations, publishedVideos, videoProgress, watchHistory, videos } = useVideo();
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const trendingRef = useRef<HTMLDivElement>(null);
    const continueRef = useRef<HTMLDivElement>(null);

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

    const trendingVideos = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - TRENDING_WINDOW_DAYS);
        return [...publishedVideos]
            .filter(v => new Date(v.publishedAt) >= cutoff)
            .sort((a, b) => b.views - a.views)
            .slice(0, TRENDING_COUNT);
    }, [publishedVideos]);

    const continueWatchingVideos = useMemo(() => {
        const videoMap = new Map(videos.map(v => [v.id, v]));
        return watchHistory
            .map(id => videoMap.get(id))
            .filter((v): v is NonNullable<typeof v> => {
                if (!v) { return false; }
                const p = videoProgress[v.id] ?? 0;
                const isInProgress = p > CONTINUE_WATCHING_MIN_PROGRESS && p < CONTINUE_WATCHING_MAX_PROGRESS;
                return isInProgress;
            })
            .slice(0, 8);
    }, [watchHistory, videos, videoProgress]);

    const firstBatchVideos = visibleVideos.slice(0, GRID_ROWS_BEFORE_INTERSTITIAL);
    const remainingVideos = visibleVideos.slice(GRID_ROWS_BEFORE_INTERSTITIAL);

    const hasTrending = trendingVideos.length > 0;
    const hasContinueWatching = continueWatchingVideos.length > 0;
    const hasResults = visibleVideos.length > 0;

    function scrollCarousel(ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') {
        const el = ref.current;
        if (!el) { return; }
        const scrollAmount = el.clientWidth * 0.7;
        el.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    }

    function handleSurpriseMe() {
        const hasVideos = publishedVideos.length > 0;
        if (!hasVideos) { return; }
        const idx = Math.floor(Math.random() * publishedVideos.length);
        const video = publishedVideos[idx];
        if (video) {
            navigate(ROUTES.VIDEO.replace(':id', video.id));
        }
    }

    return (
        <div className="home-page">
            {hasTrending && (
                <section className="home-page__section">
                    <div className="home-page__section-header">
                        <div className="home-page__section-title-group">
                            <Flame size={16} className="home-page__trending-icon" />
                            <h2 className="home-page__section-title">{t('home.trending')}</h2>
                        </div>
                        <div className="home-page__carousel-nav">
                            <Tooltip content={t('common.back')} side="top">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('common.back')}
                                    onClick={() => scrollCarousel(trendingRef, 'left')}
                                >
                                    <ChevronLeft size={16} />
                                </Button>
                            </Tooltip>
                            <Tooltip content={t('home.next')} side="top">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('home.next')}
                                    onClick={() => scrollCarousel(trendingRef, 'right')}
                                >
                                    <ChevronRight size={16} />
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="home-page__carousel" ref={trendingRef}>
                        {trendingVideos.map(video => (
                            <div key={video.id} className="home-page__carousel-item">
                                <VideoCard video={video} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="home-page__filters">
                <FilterPanel allTags={allTags} value={filterState} onChange={setFilterState} />
            </div>

            <div className="home-page__surprise">
                <Button variant="ghost" size="sm" onClick={handleSurpriseMe}>
                    <Shuffle size={14} strokeWidth={2} />
                    {t('home.surprise_me')}
                </Button>
            </div>

            {hasResults ? (
                <>
                    <div className="home-page__main">
                        <div className="home-page__grid">
                            {firstBatchVideos.map(video => (<VideoCard key={video.id} video={video} />))}
                        </div>
                    </div>

                    {hasContinueWatching && (
                        <section className="home-page__section">
                            <div className="home-page__section-header">
                                <h2 className="home-page__section-title">{t('home.continue_watching')}</h2>
                                <div className="home-page__carousel-nav">
                                    <Tooltip content={t('common.back')} side="top">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t('common.back')}
                                            onClick={() => scrollCarousel(continueRef, 'left')}
                                        >
                                            <ChevronLeft size={16} />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip content={t('home.next')} side="top">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t('home.next')}
                                            onClick={() => scrollCarousel(continueRef, 'right')}
                                        >
                                            <ChevronRight size={16} />
                                        </Button>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="home-page__carousel" ref={continueRef}>
                                {continueWatchingVideos.map(video => (
                                    <div key={video.id} className="home-page__carousel-item">
                                        <VideoCard video={video} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {remainingVideos.length > 0 && (
                        <div className="home-page__main">
                            <div className="home-page__grid">
                                {remainingVideos.map(video => (<VideoCard key={video.id} video={video} />))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="home-page__main">
                    <div className="home-page__empty">
                        <p className="home-page__empty-text">{t('video.no_results')}</p>
                    </div>
                </div>
            )}

            <button
                className="home-page__channel-link-hidden"
                onClick={() => navigate(ROUTES.CHANNEL.replace(':id', 'ch_1'))}
                aria-hidden="true"
                tabIndex={-1}
            />
        </div>
    );
}
