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

type BadgeStatus = 'processing' | 'failed' | 'scheduled' | 'watched' | null;

// Only one badge can show at a time — resolve the priority once instead of
// repeating "!isProcessing && !isFailed" guards in every branch below.
function resolveBadgeStatus({
    isProcessing,
    isFailed,
    isScheduledAndFuture,
    isWatched,
}: Omit<VideoStatusBadgesProps, 'classPrefix'>): BadgeStatus {
    if (isProcessing) {
        return 'processing';
    }

    if (isFailed) {
        return 'failed';
    }

    if (isScheduledAndFuture) {
        return 'scheduled';
    }

    if (isWatched) {
        return 'watched';
    }

    return null;
}

export default function VideoStatusBadges({
    isScheduledAndFuture,
    isWatched,
    isProcessing,
    isFailed,
    classPrefix,
}: VideoStatusBadgesProps) {
    const { t } = useTranslation();
    const status = resolveBadgeStatus({ isProcessing, isFailed, isScheduledAndFuture, isWatched });

    return (
        <>
            {status === 'processing' && (
                <div className={`${classPrefix}__badge-overlay`}>
                    <Badge variant="default">
                        <Loader2 size={10} className="badge-spin" />
                        {t('video.processing')}
                    </Badge>
                </div>
            )}
            {status === 'failed' && (
                <div className={`${classPrefix}__badge-overlay`}>
                    <Badge variant="danger">
                        <AlertCircle size={10} />
                        {t('video.failed')}
                    </Badge>
                </div>
            )}
            {status === 'scheduled' && (
                <div className={`${classPrefix}__badge-overlay`}>
                    <Badge variant="warning">{t('video.scheduled')}</Badge>
                </div>
            )}
            {status === 'watched' && (
                <div className={`${classPrefix}__watched-overlay`}>
                    <CheckCircle2 size={12} />
                    {t('video.watched')}
                </div>
            )}
        </>
    );
}
