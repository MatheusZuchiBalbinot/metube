import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, Flame, PlayCircle, Shuffle, Sparkles, Clapperboard, Rss, History as HistoryIcon } from 'lucide-react';
import { domain } from '@domain';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import Button from '@ui/button/button';
import EmptyState from '@ui/empty/empty';
import Spinner from '@ui/spinner/spinner';
import './home.css';
import { useVideoData, useFilterState, useAuth } from '@hooks';
import { VideoFilter, ROUTES, videoUrl, greetingPeriod } from '@utils';
import type { Tag, Video } from '@models';
import type { FeedSection } from '@api';
import { useFeedSections } from './hooks/useFeedSections';
import { useInfiniteRecommendations } from './hooks/useInfiniteRecommendations';
import VideoShelf from './components/VideoShelf';
import CategoryChips from './components/CategoryChips';
import FeaturedHero from './components/FeaturedHero';

const MAX_CATEGORY_CHIPS = 14;
const MAX_CONTINUE_WATCHING = 12;

function sectionTitle(section: FeedSection, t: (key: string, opts?: Record<string, unknown>) => string): string {
    switch (section.key) {
        case 'subscriptions': return t('nav.subscriptions_feed');
        case 'trending': return t('home.trending');
        case 'recent': return t('home.recently_published');
        case 'shorts': return t('nav.shorts');
        case 'because_you_watched': return t('home.because_you_watched', { tag: section.label ?? '' });
        default: return section.label ?? section.key;
    }
}

function sectionIcon(key: string): React.ReactNode {
    switch (key) {
        case 'subscriptions': return <Rss size={16} className="home-page__section-icon" />;
        case 'trending': return <Flame size={16} className="home-page__trending-icon" />;
        case 'recent': return <Sparkles size={16} className="home-page__section-icon" />;
        case 'shorts': return <Clapperboard size={16} className="home-page__section-icon" />;
        default: return undefined;
    }
}

// eslint-disable-next-line complexity
export default function HomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { recommendations, recommendationsLoading, publishedVideos, videos, watchHistory, videoProgress } = useVideoData();
    const { filterState, setFilterState, hasActiveFilters, clearFilters } = useFilterState();
    const [category, setCategory] = useState<Tag | null>(null);

    const { loadMore } = useInfiniteRecommendations();
    const { sections } = useFeedSections();
    const sentinelRef = useRef<HTMLDivElement>(null);

    const continueWatching = useMemo(() => {
        const videoMap = new Map<string, Video>(videos.map(v => [v.id, v]));
        return watchHistory
            .map(id => videoMap.get(id))
            .filter((v): v is Video => v !== undefined && domain.video.hasActiveProgress(videoProgress[v.id] ?? 0))
            .slice(0, MAX_CONTINUE_WATCHING);
    }, [videos, watchHistory, videoProgress]);

    // Derive chips from the same list the grid filters (recommendations), so every
    // chip yields at least one result instead of collapsing to an empty grid.
    const categoryTags = useMemo(() => {
        const freq = new Map<Tag, number>();
        for (const video of recommendations) {
            for (const tag of video.tags) {
                if (tag === ('shorts' as Tag)) {
                    continue;
                }
                freq.set(tag, (freq.get(tag) ?? 0) + 1);
            }
        }
        return Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_CATEGORY_CHIPS)
            .map(([tag]) => tag);
    }, [recommendations]);

    const allTags = useMemo(() => {
        const tagSet = new Set<Tag>();
        for (const video of recommendations) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }, [recommendations]);

    const visibleVideos = useMemo(() => {
        const base = VideoFilter.apply(recommendations, filterState);
        if (category === null) {
            return base;
        }
        return base.filter(v => v.tags.includes(category));
    }, [recommendations, filterState, category]);

    const heroVideo = sections.find(s => s.key === 'trending')?.videos[0] ?? recommendations[0] ?? null;

    // Picking a category (or any filter) collapses the page to the filtered grid, so the
    // narrowing is obvious instead of only affecting a grid far below the shelves.
    const isDefaultView = category === null && !hasActiveFilters;

    const hasResults = visibleVideos.length > 0;
    const hasBaseVideos = recommendations.length > 0;
    const hasNarrowing = hasActiveFilters || category !== null;
    const isFilteredEmpty = hasBaseVideos && !hasResults && hasNarrowing;
    const isCompletelyEmpty = !hasBaseVideos;

    const greeting = user !== null
        ? t(`home.greeting_${greetingPeriod()}`, { name: user.name })
        : t('home.greeting_generic');

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) {
            return;
        }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                void loadMore();
            }
        }, { rootMargin: '800px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore]);

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

    function handleClearAll() {
        clearFilters();
        setCategory(null);
    }

    return (
        <div className="home-page">
            <header className="home-page__greeting">
                <h1 className="home-page__greeting-title">{greeting}</h1>
            </header>

            <CategoryChips tags={categoryTags} selected={category} onSelect={setCategory} />

            {heroVideo && isDefaultView && (
                <FeaturedHero video={heroVideo} />
            )}

            {isDefaultView && (
                <>
                    <VideoShelf
                        title={t('home.continue_watching')}
                        videos={continueWatching}
                        icon={<HistoryIcon size={16} className="home-page__section-icon" />}
                    />

                    {sections.map(section => (
                        <VideoShelf
                            key={section.key}
                            title={sectionTitle(section, t)}
                            videos={section.videos}
                            icon={sectionIcon(section.key)}
                            action={section.key === 'shorts' ? (
                                <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.SHORTS)}>
                                    {t('home.see_all')}
                                </Button>
                            ) : undefined}
                        />
                    ))}
                </>
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
                        onAction={handleClearAll}
                    />
                </div>
            )}

            {hasResults && (
                <div className="home-page__main">
                    <div className="home-page__grid">
                        {visibleVideos.map((video, i) => (<VideoCard key={video.id} video={video} index={i} />))}
                    </div>
                    <div ref={sentinelRef} className="home-page__sentinel" aria-hidden="true" />
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
