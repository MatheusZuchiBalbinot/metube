import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff } from 'lucide-react';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import { video as videoApi, toVuid } from '@api';
import { Button } from '@ui';
import { VideoStatus } from '@models';
import type { Video } from '@models';
import './stagingBanner.css';

interface StagingBannerProps {
    video: Video
}

export default function StagingBanner({ video }: StagingBannerProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [publishing, setPublishing] = useState(false);

    const handlePublish = useCallback(async (): Promise<void> => {
        setPublishing(true);

        const result = await videoApi.publish(toVuid(video.id));

        setPublishing(false);

        if (!result.ok) {
            dispatch(toastActions.addToast({ message: result.error, type: ToastType.ERROR }));
            return;
        }

        dispatch(videoActions.updateVideoStatus({ vuid: toVuid(video.id), status: VideoStatus.PUBLISHED }));
        dispatch(toastActions.addToast({ message: t('video.staging.published_toast'), type: ToastType.SUCCESS }));
    }, [video.id, dispatch, t]);

    return (
        <div className="staging-banner" role="status">
            <div className="staging-banner__left">
                <EyeOff size={16} aria-hidden="true" />
                <span className="staging-banner__label">{t('video.staging.draft_label')}</span>
            </div>
            <Button
                variant="primary"
                size="sm"
                disabled={publishing}
                onClick={() => void handlePublish()}
            >
                {publishing ? t('video.staging.publishing') : t('video.staging.publish_btn')}
            </Button>
        </div>
    );
}
