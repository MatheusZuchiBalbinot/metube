import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import VideoCard from '@components/video/card';
import type { FilterState } from '@components/filter/panel';
import VideoGridPage from '@components/layout/videoGridPage';
import { VideoFilter } from '@utils';
import { AnalyticsSource } from '@api';
import { useVideoData } from '@hooks';
import { useRecommendedFeed } from './hooks/useRecommendedFeed';

export default function RecommendedPage() {
    const { t } = useTranslation();
    useRecommendedFeed();
    const { recommendations, recommendationsLoading } = useVideoData();
    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());

    return (
        <VideoGridPage
            title={t('nav.recommended')}
            videos={recommendations}
            filters={filters}
            onFiltersChange={setFilters}
            loading={recommendationsLoading && recommendations.length === 0}
            emptyIcon={<Compass size={40} strokeWidth={1.25} />}
            emptyDescription={t('recommended.empty_text')}
            renderItem={(video, i) => (
                <VideoCard
                    key={video.id}
                    video={video}
                    index={i}
                    source={AnalyticsSource.RECOMMENDED}
                />
            )}
        />
    );
}
