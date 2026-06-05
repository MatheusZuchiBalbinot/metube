import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, type Transition } from 'framer-motion';
import { Filter, Flame, PlayCircle, Shuffle } from 'lucide-react';
import { domain } from '@domain';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import Button from '@ui/button/button';
import CarouselNav from '@components/ui/carouselNav/carouselNav';
import EmptyState from '@ui/empty/empty';
import './home.css';
import { useInView, useVideo, useFilterState } from '@hooks';
import Spinner from '@ui/spinner/spinner';
import { VideoFilter, ROUTES, videoUrl } from '@utils';
import type { Tag, Video, VideoId } from '@models';
import { useHomeFeed } from './hooks/useHomeFeed';

// 2 years: long enough to include recent uploads but short enough to filter
// out truly old content from the trending carousel.
const TRENDING_WINDOW_DAYS = 730;

// Number of videos shown in the trending carousel. 8 fits 2 rows of cards at
// the most common desktop viewport widths (1280–1920 px).
const TRENDING_COUNT = 8;

const SECTION_VISIBLE = { opacity: 1, y: 0 };
const SECTION_HIDDEN = { opacity: 0, y: 16 };
const SECTION_TRANSITION: Transition = { duration: 0.35, ease: [0.16, 1, 0.3, 1] };

export default function HomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { recommendations, recommendationsLoading, publishedVideos, videoProgress, watchHistory, videos } = useVideo();
    const { filterState, setFilterState, hasActiveFilters, clearFilters } = useFilterState();

    useHomeFeed();
    const trendingRef = useRef<HTMLDivElement>(null);
    const continueRef = useRef<HTMLDivElement>(null);
    const { ref: trendingSectionRef, inView: trendingVisible } = useInView({ rootMargin: '-40px' });
    const { ref: continueSectionRef, inView: continueVisible } = useInView({ rootMargin: '-40px' });
    const [trendingScroll, setTrendingScroll] = useState({ canScrollLeft: false, canScrollRight: true });
    const [continueScroll, setContinueScroll] = useState({ canScrollLeft: false, canScrollRight: true });

    const allTags = useMemo(() => {
        const tagSet = new Set<Tag>();
        for (const video of recommendations) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
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
        const videoMap = new Map<VideoId, Video>(videos.map((video: Video) => [video.id, video]));
        return watchHistory
            .map(id => videoMap.get(id))
            .filter((video): video is NonNullable<typeof video> => {
                if (!video) {
                    return false;
                }
                const progress = videoProgress[video.id] ?? 0;
                const isInProgress = domain.video.hasActiveProgress(progress);
                return isInProgress;
            })
            .slice(0, 8);
    }, [watchHistory, videos, videoProgress]);

    const hasTrending = trendingVideos.length > 0;
    const hasContinueWatching = continueWatchingVideos.length > 0;
    const hasResults = visibleVideos.length > 0;
    const hasBaseVideos = recommendations.length > 0;
    const isFilteredEmpty = hasBaseVideos && !hasResults && hasActiveFilters;
    const isCompletelyEmpty = !hasBaseVideos;

    function getScrollState(el: HTMLDivElement) {
        const canScrollLeft = el.scrollLeft > 1;
        const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
        return { canScrollLeft, canScrollRight };
    }

    useEffect(() => {
        const el = trendingRef.current;
        if (!el) {
            return;
        }
        function update() {
            setTrendingScroll(getScrollState(el!));
        }
        update();
        el.addEventListener('scroll', update, { passive: true });
        return () => el.removeEventListener('scroll', update);
    }, [hasTrending]);

    useEffect(() => {
        const el = continueRef.current;
        if (!el) {
            return;
        }
        function update() {
            setContinueScroll(getScrollState(el!));
        }
        update();
        el.addEventListener('scroll', update, { passive: true });
        return () => el.removeEventListener('scroll', update);
    }, [hasContinueWatching]);

    function scrollCarousel(ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') {
        const el = ref.current;
        if (!el) {
            return;
        }
        const scrollAmount = el.clientWidth * 0.7;
        el.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    }

    function handleSurpriseMe() {
        const hasVideos = publishedVideos.length > 0;
        if (!hasVideos) {
            return;
        }
        const idx = Math.floor(Math.random() * publishedVideos.length);
        const video = publishedVideos[idx];
        if (video) {
            navigate(videoUrl(video.id));
        }
    }

    return (
        <div className="home-page">
            {hasContinueWatching && (
                <motion.section
                    ref={continueSectionRef as React.RefObject<HTMLElement>}
                    className="home-page__section"
                    initial={SECTION_HIDDEN}
                    animate={continueVisible ? SECTION_VISIBLE : SECTION_HIDDEN}
                    transition={SECTION_TRANSITION}
                >
                    <div className="home-page__section-header">
                        <h2 className="home-page__section-title">{t('home.continue_watching')}</h2>
                        <CarouselNav
                            className="home-page__carousel-nav"
                            onPrev={() => scrollCarousel(continueRef, 'left')}
                            onNext={() => scrollCarousel(continueRef, 'right')}
                            canScrollLeft={continueScroll.canScrollLeft}
                            canScrollRight={continueScroll.canScrollRight}
                        />
                    </div>
                    <div className="home-page__carousel" ref={continueRef}>
                        {continueWatchingVideos.map((video: Video) => (
                            <div key={video.id} className="home-page__carousel-item">
                                <VideoCard video={video} />
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}

            {hasTrending && (
                <motion.section
                    ref={trendingSectionRef as React.RefObject<HTMLElement>}
                    className="home-page__section"
                    initial={SECTION_HIDDEN}
                    animate={trendingVisible ? SECTION_VISIBLE : SECTION_HIDDEN}
                    transition={SECTION_TRANSITION}
                >
                    <div className="home-page__section-header">
                        <div className="home-page__section-title-group">
                            <Flame size={16} className="home-page__trending-icon" />
                            <h2 className="home-page__section-title">{t('home.trending')}</h2>
                        </div>
                        <CarouselNav
                            className="home-page__carousel-nav"
                            onPrev={() => scrollCarousel(trendingRef, 'left')}
                            onNext={() => scrollCarousel(trendingRef, 'right')}
                            canScrollLeft={trendingScroll.canScrollLeft}
                            canScrollRight={trendingScroll.canScrollRight}
                        />
                    </div>
                    <div className="home-page__carousel" ref={trendingRef}>
                        {trendingVideos.map(video => (
                            <div key={video.id} className="home-page__carousel-item">
                                <VideoCard video={video} />
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}

            <div className="home-page__toolbar">
                <Button variant="ghost" size="sm" leftIcon={<Shuffle size={14} strokeWidth={2} />} onClick={handleSurpriseMe} className="home-page__surprise-btn">
                    {t('home.surprise_me')}
                </Button>
                <div className="home-page__filters">
                    <FilterPanel allTags={allTags} value={filterState} onChange={setFilterState} />
                </div>
            </div>

            {recommendationsLoading && (
                <div className="home-page__main">
                    <Spinner />
                </div>
            )}

            {!recommendationsLoading && isCompletelyEmpty && (
                <div className="home-page__main">
                    <EmptyState
                        icon={<PlayCircle />}
                        title={t('home.empty_title', 'No videos yet')}
                        description={t('home.empty_desc', 'Check back later for new content')}
                    />
                </div>
            )}

            {isFilteredEmpty && (
                <div className="home-page__main">
                    <EmptyState
                        icon={<Filter />}
                        title={t('home.filtered_title', 'No matching videos')}
                        description={t('home.filtered_desc', 'Try adjusting your filters')}
                        actionLabel={t('home.filtered_action', 'Clear filters')}
                        onAction={clearFilters}
                    />
                </div>
            )}

            {hasResults && (
                <div className="home-page__main">
                    <div className="home-page__grid">
                        {visibleVideos.map((video, i) => (<VideoCard key={video.id} video={video} index={i} />))}
                    </div>
                </div>
            )}

            <button
                className="home-page__channel-link-hidden"
                onClick={() => navigate(ROUTES.USER.replace(':id', 'ch_1'))}
                aria-hidden="true"
                tabIndex={-1}
            />
        </div>
    );
}
