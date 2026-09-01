import { CheckCircle2, Loader2, AlertCircle, EyeOff } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import Badge from '@ui/badge/badge';

interface VideoStatusBadgesProps {
    isDraft: boolean
    isScheduledAndFuture: boolean
    isWatched: boolean
    isProcessing: boolean
    isFailed: boolean
    classPrefix: string
}

type BadgeStatus = 'draft' | 'processing' | 'failed' | 'scheduled' | 'watched' | null;

// isDraft/isProcessing/isFailed/isScheduledAndFuture all come from one `status` field, so
// they're mutually exclusive — resolved once here instead of per-branch guards below.
function resolveBadgeStatus({
    isDraft,
    isProcessing,
    isFailed,
    isScheduledAndFuture,
    isWatched,
}: Omit<VideoStatusBadgesProps, 'classPrefix'>): BadgeStatus {
    if (isDraft) {
        return 'draft';
    }

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
    isDraft,
    isScheduledAndFuture,
    isWatched,
    isProcessing,
    isFailed,
    classPrefix,
}: VideoStatusBadgesProps) {
    const { t } = useTranslation();
    const status = resolveBadgeStatus({ isDraft, isProcessing, isFailed, isScheduledAndFuture, isWatched });

    return (
        <>
            {status === 'draft' && (
                <div className={`${classPrefix}__badge-overlay`}>
                    <Badge variant="neutral">
                        <EyeOff size={10} />
                        {t('video.draft')}
                    </Badge>
                </div>
            )}
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
