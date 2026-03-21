import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '@ui/badge/badge';

interface VideoStatusBadgesProps {
    isScheduledAndFuture: boolean;
    isNew: boolean;
    isWatched: boolean;
    classPrefix: string;
}

export default function VideoStatusBadges({ isScheduledAndFuture, isNew, isWatched, classPrefix }: VideoStatusBadgesProps) {
    const { t } = useTranslation();

    return (
        <>
            {isScheduledAndFuture && (
                <div className={`${classPrefix}__badge-overlay`}>
                    <Badge variant="warning">{t('video.scheduled')}</Badge>
                </div>
            )}
            {isNew && !isScheduledAndFuture && (
                <div className={`${classPrefix}__new-overlay`}>
                    <Badge variant="success">{t('video.new')}</Badge>
                </div>
            )}
            {isWatched && (
                <div className={`${classPrefix}__watched-overlay`}>
                    <CheckCircle2 size={12} />
                    {t('video.watched')}
                </div>
            )}
        </>
    );
}
