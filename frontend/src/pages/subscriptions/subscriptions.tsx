import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Rss } from 'lucide-react';
import VideoCard from '@components/video/card';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import EmptyState from '@ui/empty/empty';
import { VideoFilter } from '@utils';
import { AnalyticsSource } from '@api';
import { useVideo, useSubscription } from '@hooks';
import './subscriptions.css';
import type { Tag } from '@models';

export default function SubscriptionsFeedPage() {
    const { t } = useTranslation();
    const { publishedVideos } = useVideo();
    const { subscribedSet } = useSubscription();
    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());

    const feed = useMemo(
        () => publishedVideos.filter(v => subscribedSet.has(v.channelId)),
        [publishedVideos, subscribedSet],
    );

    const allTags = useMemo(() => {
        const tagSet = new Set<Tag>();
        for (const video of feed) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }, [feed]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(feed, filters),
        [feed, filters],
    );

    const hasVideos = feed.length > 0;
    const hasResults = filteredVideos.length > 0;

    return (
        <div className="subscriptions-page">
            <div className="subscriptions-page__header">
                <h1 className="subscriptions-page__title">{t('nav.subscriptions_feed')}</h1>
                {hasVideos && (
                    <p className="subscriptions-page__count">
                        {t('video.videos_count', { count: feed.length })}
                    </p>
                )}
            </div>

            {hasVideos && (
                <div className="subscriptions-page__filters">
                    <FilterPanel allTags={allTags} value={filters} onChange={setFilters} />
                </div>
            )}

            {!hasVideos && (
                <EmptyState
                    icon={<Rss size={40} strokeWidth={1.25} />}
                    title={t('nav.subscriptions_feed')}
                    description={t('subscriptions_feed.empty_text')}
                />
            )}
            {hasVideos && !hasResults && (
                <EmptyState
                    icon={<Rss size={40} strokeWidth={1.25} />}
                    title={t('video.no_results')}
                    description={t('video.filter_clear')}
                />
            )}
            {hasVideos && hasResults && (
                <div className="subscriptions-page__grid">
                    {filteredVideos.map((video, i) => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            index={i}
                            source={AnalyticsSource.FEED}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
