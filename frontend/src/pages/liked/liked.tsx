import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { Heart, HeartOff } from 'lucide-react';
import VideoActionCard from '@components/video/actionCard';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import { useVideo } from '@hooks/useVideo';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { VideoFilter } from '@utils/applyFilters';
import type { Video } from '@data/mockVideos';
import type { VideoId } from '@models/video';
import type { Tag } from '@models/tag';
import './liked.css';

export default function LikedPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { likedVideos, videos, likeVideo } = useVideo();

    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());

    const likedVideoList = useMemo(() => {
        return videos.filter((v: Video) => likedVideos.has(v.id));
    }, [likedVideos, videos]);

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
        dispatch(toastActions.addToast({ message: t('toast.unliked'), type: 'info' }));
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
                <div className="liked-page__empty">
                    <Heart size={40} strokeWidth={1.25} className="liked-page__empty-icon" />
                    <p className="liked-page__empty-title">{t('nav.liked_videos')}</p>
                    <p className="liked-page__empty-text">{t('liked.empty_text')}</p>
                </div>
            )}
            {hasLiked && !hasResults && (
                <div className="liked-page__empty">
                    <Heart size={40} strokeWidth={1.25} className="liked-page__empty-icon" />
                    <p className="liked-page__empty-title">{t('video.no_results')}</p>
                    <p className="liked-page__empty-text">{t('video.filter_clear')}</p>
                </div>
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
