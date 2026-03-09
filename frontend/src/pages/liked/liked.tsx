import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import VideoCard from '@components/video/card';
import { useVideo } from '@context/useVideo';
import './liked.css';

export default function LikedPage() {
    const { t } = useTranslation();
    const { likedVideos, videos } = useVideo();

    const likedVideoList = useMemo(() => {
        return videos.filter(v => likedVideos.has(v.id));
    }, [likedVideos, videos]);

    const hasLiked = likedVideoList.length > 0;

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

            {hasLiked ? (
                <div className="liked-page__grid">
                    {likedVideoList.map(video => (
                        <VideoCard key={video.id} video={video} />
                    ))}
                </div>
            ) : (
                <div className="liked-page__empty">
                    <Heart size={40} strokeWidth={1.25} className="liked-page__empty-icon" />
                    <p className="liked-page__empty-title">{t('nav.liked_videos')}</p>
                    <p className="liked-page__empty-text">{t('liked.empty_text')}</p>
                </div>
            )}
        </div>
    );
}
