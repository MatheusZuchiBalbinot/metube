import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '@ui/badge/badge';

interface VideoStatusBadgesProps {
    isScheduledAndFuture: boolean
    isNew: boolean
    isWatched: boolean
    isProcessing: boolean
    isFailed: boolean
    classPrefix: string
}

export default function VideoStatusBadges({
    isScheduledAndFuture,
    isNew,
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
            {isNew && !isScheduledAndFuture && !isProcessing && !isFailed && (
                <div className={`${classPrefix}__new-overlay`}>
                    <Badge variant="success">{t('video.new')}</Badge>
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
