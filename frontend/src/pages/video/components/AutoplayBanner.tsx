import { X } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@ui';
import type { Video } from '@models';

interface AutoplayBannerProps {
    countdown: number
    nextVideo: Video
    onCancel: () => void
}

export default function AutoplayBanner({ countdown, nextVideo, onCancel }: AutoplayBannerProps) {
    const { t } = useTranslation();

    return (
        <div
            className="video-page__autoplay-banner"
            aria-live="polite"
            aria-atomic="true"
            role="status"
        >
            <div className="video-page__autoplay-info">
                <span className="video-page__autoplay-label">{t('video.autoplay_next')}</span>
                <span className="video-page__autoplay-title">{nextVideo.title}</span>
            </div>
            <div className="video-page__autoplay-countdown">
                <div className="video-page__autoplay-progress" style={{ animationDuration: '5s' }} />
                <span className="video-page__autoplay-seconds">{countdown}</span>
            </div>
            <Tooltip content={t('video.autoplay_cancel')} side="top">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCancel}
                    aria-label={t('video.autoplay_cancel')}
                >
                    <X size={14} />
                </Button>
            </Tooltip>
        </div>
    );
}
