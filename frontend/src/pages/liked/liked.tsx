import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { Heart, HeartOff } from 'lucide-react';
import VideoActionCard from '@components/video/actionCard';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import { useVideo } from '@hooks/useVideo';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { VideoFilter } from '@utils/applyFilters';
import { interactions } from '@api/interactions';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import EmptyState from '@ui/empty/empty';
import type { Video, VideoId } from '@models/video';
import type { Tag } from '@models/tag';
import './liked.css';

// eslint-disable-next-line complexity
export default function LikedPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { likeVideo } = useVideo();

    const [likedVideoList, setLikedVideoList] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());

    useEffect(() => {
        interactions.liked().then(result => {
            if (result) {
                setLikedVideoList(result.data);
            }
        }).finally(() => setLoading(false));
    }, []);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const v of likedVideoList) {
            for (const tag of v.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort() as unknown as Tag[];
    }, [likedVideoList]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(likedVideoList, filters),
        [likedVideoList, filters],
    );

    const hasLiked = likedVideoList.length > 0;
    const hasResults = filteredVideos.length > 0;
    const isTouchDevice = useMediaQuery('(hover: none)');

    function handleUnlike(videoId: string) {
        likeVideo(videoId as unknown as VideoId);
        setLikedVideoList(prev => prev.filter(v => v.id !== videoId));
        dispatch(toastActions.addToast({ message: t('toast.unliked'), type: 'info' }));
    }

    if (loading) {
        return (
            <div className="liked-page">
                <div className="liked-page__grid">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="liked-page">
            <div className="liked-page__header">
                <h1 className="liked-page__title">{t('nav.liked_videos')}</h1>
                {hasLiked && (
                    <p className="liked-page__count">
                        {t('video.videos_count', { count: likedVideoList.length })}
                    </p>
                )}
            </div>

            {hasLiked && (
                <div className="liked-page__filters">
                    <FilterPanel allTags={allTags} value={filters} onChange={setFilters} />
                </div>
            )}

            {!hasLiked && (
                <EmptyState
                    icon={<Heart size={40} strokeWidth={1.25} />}
                    title={t('nav.liked_videos')}
                    description={t('liked.empty_text')}
                />
            )}
            {hasLiked && !hasResults && (
                <EmptyState
                    icon={<Heart size={40} strokeWidth={1.25} />}
                    title={t('video.no_results')}
                    description={t('video.filter_clear')}
                />
            )}
            {hasLiked && hasResults && (
                <div className="liked-page__grid">
                    {filteredVideos.map((video, i) => (
                        <VideoActionCard
                            key={video.id}
                            video={video}
                            index={i}
                            actionIcon={<HeartOff size={14} strokeWidth={2} />}
                            actionLabel={t('liked.unlike')}
                            itemClass="liked-page__item"
                            btnClass={['liked-page__unlike-btn', isTouchDevice ? 'liked-page__unlike-btn--touch' : ''].filter(Boolean).join(' ')}
                            onAction={handleUnlike}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
