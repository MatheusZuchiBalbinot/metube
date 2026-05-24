import { useTranslation } from 'react-i18next';

interface VideoNotFoundProps {
    fetchFailed: boolean
}

export default function VideoNotFound({ fetchFailed }: VideoNotFoundProps) {
    const { t } = useTranslation();

    return (
        <div className="video-page">
            <div className="video-page__not-found">
                <p>{fetchFailed ? t('video.not_found') : t('common.loading')}</p>
            </div>
        </div>
    );
}
