import { VideoOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VideoFallbackProps {
    thumbnail: string | undefined
    title: string
}

export default function VideoFallback({ thumbnail, title }: VideoFallbackProps) {
    const { t } = useTranslation();

    return (
        <div className="video-page__player">
            <div className="video-page__player-fallback">
                <img
                    src={thumbnail}
                    alt={title}
                    className="video-page__player-fallback-img"
                />
                <div className="video-page__player-fallback-msg">
                    <VideoOff size={32} strokeWidth={1.5} />
                    <p>{t('video.no_video_file')}</p>
                </div>
            </div>
        </div>
    );
}
