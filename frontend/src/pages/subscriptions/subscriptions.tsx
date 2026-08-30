import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Rss } from 'lucide-react';
import VideoCard from '@components/video/card';
import type { FilterState } from '@components/filter/panel';
import VideoGridPage from '@components/layout/videoGridPage';
import { VideoFilter } from '@utils';
import { AnalyticsSource } from '@api';
import { useVideoData, useSubscription } from '@hooks';
import type { Video } from '@models';

export default function SubscriptionsFeedPage() {
    const { t } = useTranslation();
    const { publishedVideos } = useVideoData();
    const { subscribedSet } = useSubscription();
    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());

    const feed = useMemo(
        () => publishedVideos.filter((v: Video) => subscribedSet.has(v.channelId)),
        [publishedVideos, subscribedSet],
    );

    return (
        <VideoGridPage
            title={t('nav.subscriptions_feed')}
            videos={feed}
            filters={filters}
            onFiltersChange={setFilters}
            emptyIcon={<Rss size={40} strokeWidth={1.25} />}
            emptyDescription={t('subscriptions_feed.empty_text')}
            renderItem={(video, i) => (
                <VideoCard
                    key={video.id}
                    video={video}
                    index={i}
                    source={AnalyticsSource.FEED}
                />
            )}
        />
    );
}
