import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, X } from 'lucide-react';
import VideoCard from '@components/video/card';
import { useVideo } from '@context/useVideo';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import './later.css';

export default function WatchLaterPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { savedVideos, videos, saveVideo } = useVideo();

    const watchLaterList = useMemo(() => {
        return videos.filter(v => savedVideos.has(v.id));
    }, [savedVideos, videos]);

    const hasVideos = watchLaterList.length > 0;

    function handleRemove(videoId: string) {
        const isCurrentlySaved = savedVideos.has(videoId);
        dispatch(toastActions.addToast({
            message: t(isCurrentlySaved ? 'toast.unsaved' : 'toast.saved'),
            type: 'success',
        }));
        saveVideo(videoId);
    }

    return (
        <div className="watch-later-page">
            <div className="watch-later-page__header">
                <h1 className="watch-later-page__title">{t('nav.watch_later')}</h1>
                {hasVideos && (
                    <p className="watch-later-page__count">
                        {t('video.videos_count', { count: watchLaterList.length })}
                    </p>
                )}
            </div>

            {hasVideos ? (
                <div className="watch-later-page__grid">
                    {watchLaterList.map((video, i) => (
                        <div key={video.id} className="watch-later-page__item">
                            <VideoCard video={video} index={i} />
                            <Tooltip content={t('watch_later.remove')} side="top">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="watch-later-page__remove-btn"
                                    onClick={() => handleRemove(video.id)}
                                    aria-label={t('watch_later.remove')}
                                >
                                    <X size={14} strokeWidth={2} />
                                </Button>
                            </Tooltip>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="watch-later-page__empty">
                    <Clock size={40} strokeWidth={1.25} className="watch-later-page__empty-icon" />
                    <p className="watch-later-page__empty-title">{t('nav.watch_later')}</p>
                    <p className="watch-later-page__empty-text">{t('watch_later.empty_text')}</p>
                </div>
            )}
        </div>
    );
}
