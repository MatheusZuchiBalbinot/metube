import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '@ui/badge/badge';

interface VideoStatusBadgesProps {
    isScheduledAndFuture: boolean
    isWatched: boolean
    isProcessing: boolean
    isFailed: boolean
    classPrefix: string
}

// eslint-disable-next-line complexity
export default function VideoStatusBadges({
    isScheduledAndFuture,
    isWatched,
    isProcessing,
    isFailed,
    classPrefix,
}: VideoStatusBadgesProps) {
    const { t } = useTranslation();

    return (
        <>
            {isProcessing && (
                <div className={`${classPrefix}__badge-overlay`}>
                    <Badge variant="default">
                        <Loader2 size={10} className="badge-spin" />
                        {t('video.processing')}
                    </Badge>
                </div>
            )}
            {isFailed && !isProcessing && (
                <div className={`${classPrefix}__badge-overlay`}>
                    <Badge variant="danger">
                        <AlertCircle size={10} />
                        {t('video.failed')}
                    </Badge>
                </div>
            )}
            {isScheduledAndFuture && !isProcessing && !isFailed && (
                <div className={`${classPrefix}__badge-overlay`}>
                    <Badge variant="warning">{t('video.scheduled')}</Badge>
                </div>
            )}
            {isWatched && !isProcessing && !isFailed && (
                <div className={`${classPrefix}__watched-overlay`}>
                    <CheckCircle2 size={12} />
                    {t('video.watched')}
                </div>
            )}
        </>
    );
}
