import { Clapperboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Video } from '@models';

interface VideoProcessingScreenProps {
    video: Video
}

export default function VideoProcessingScreen({ video }: VideoProcessingScreenProps) {
    const { t } = useTranslation();

    return (
        <div className="video-page">
            <div className="video-page__processing">
                {video.thumbnail && (
                    <img
                        className="video-page__processing-thumb"
                        src={video.thumbnail}
                        alt=""
                        aria-hidden="true"
                    />
                )}
                <div className="video-page__processing-bg" aria-hidden="true" />
                <div className="video-page__processing-card">
                    <div className="video-page__processing-icon-wrap" aria-hidden="true">
                        <div className="video-page__processing-ring video-page__processing-ring--outer" />
                        <div className="video-page__processing-ring video-page__processing-ring--inner" />
                        <div className="video-page__processing-icon">
                            <Clapperboard size={34} strokeWidth={1.25} />
                        </div>
                    </div>
                    <h2 className="video-page__processing-title">{t('video.processing_title')}</h2>
                    <p className="video-page__processing-sub">{t('video.processing_sub')}</p>
                    <p className="video-page__processing-video-name">{video.title}</p>
                    <div className="video-page__processing-progress" aria-hidden="true">
                        <div className="video-page__processing-progress-bar" />
                    </div>
                </div>
            </div>
        </div>
    );
}
