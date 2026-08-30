import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, HeartOff } from 'lucide-react';
import VideoActionCard from '@components/video/actionCard';
import type { FilterState } from '@components/filter/panel';
import VideoGridPage from '@components/layout/videoGridPage';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { VideoFilter, cn } from '@utils';
import { interactions } from '@api';
import './liked.css';
import { ToastType } from '@enums/toastType';
import { useMediaQuery, useVideoActions } from '@hooks';
import type { Video, VideoId } from '@models';

export default function LikedPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { likeVideo } = useVideoActions();

    const [likedVideoList, setLikedVideoList] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());
    const isTouchDevice = useMediaQuery('(hover: none)');

    useEffect(() => {
        interactions.liked().then(result => {
            if (result.ok) {
                setLikedVideoList(result.data.data);
            }
        }).finally(() => setLoading(false));
    }, []);

    function handleUnlike(videoId: VideoId) {
        likeVideo(videoId);
        setLikedVideoList(prev => prev.filter(v => v.id !== videoId));
        dispatch(toastActions.addToast({ message: t('toast.unliked'), type: ToastType.INFO }));
    }

    return (
        <VideoGridPage
            title={t('nav.liked_videos')}
            videos={likedVideoList}
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
            emptyIcon={<Heart size={40} strokeWidth={1.25} />}
            emptyDescription={t('liked.empty_text')}
            renderItem={(video, i) => (
                <VideoActionCard
                    key={video.id}
                    video={video}
                    index={i}
                    actionIcon={<HeartOff size={14} strokeWidth={2} />}
                    actionLabel={t('liked.unlike')}
                    itemClass="liked-page__item"
                    btnClass={cn('liked-page__unlike-btn', isTouchDevice && 'liked-page__unlike-btn--touch')}
                    onAction={handleUnlike}
                />
            )}
        />
    );
}
