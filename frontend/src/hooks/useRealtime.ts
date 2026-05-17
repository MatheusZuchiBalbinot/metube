import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store/index';
import { notificationsActions } from '@store/notificationsSlice';
import { toastActions } from '@store/toastSlice';
import { videoActions } from '@store/videoSlice';
import { notifications as notificationsApi } from '@api/notifications';
import type { Notification } from '@api/notifications';
import { NotificationType } from '@enums/notificationType';
import getEcho, { destroyEcho } from '@lib/echo';
import { ToastType } from '@enums/toastType';
import { VideoStatus } from '@models/video';
import { video as videoApi, type Vuid } from '@api/videos';

export function useRealtime(): void {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.auth.user);

    useEffect(() => {
        if (user === null) {
            return;
        }

        const fetchInitialCount = async (): Promise<void> => {
            const count = await notificationsApi.unreadCount();
            dispatch(notificationsActions.setUnreadCount(count));
        };

        void fetchInitialCount();

        const echo = getEcho();
        const isRealtimeAvailable = echo !== null;

        if (!isRealtimeAvailable) {
            return;
        }

        const channel = echo.private(`users.${user.uuid}`);

        channel.notification((notification: Notification) => {
            dispatch(notificationsActions.addNotification(notification));
            dispatch(toastActions.addToast({
                message: formatNotificationMessage(notification),
                type: ToastType.INFO,
            }));
        });

        channel.listen('.VideoStatusUpdated', (data: { vuid: string; status: string }) => {
            dispatch(videoActions.updateVideoStatus({ vuid: data.vuid, status: data.status }));

            const isTerminalStatus = data.status !== VideoStatus.PROCESSING;
            if (isTerminalStatus) {
                videoApi.get(data.vuid as Vuid).then(result => {
                    if (result !== null) {
                        dispatch(videoActions.updateVideo(result));
                    }
                });
            }

            if (data.status === VideoStatus.PROCESSING) {
                dispatch(toastActions.addToast({
                    message: t('video.processing_toast'),
                    type: ToastType.INFO,
                }));
            } else if (data.status === VideoStatus.PUBLISHED) {
                dispatch(toastActions.addToast({
                    message: t('video.published_toast'),
                    type: ToastType.SUCCESS,
                }));
            } else if (data.status === VideoStatus.FAILED) {
                dispatch(toastActions.addToast({
                    message: t('video.failed_toast'),
                    type: ToastType.ERROR,
                }));
            }
        });

        channel.listen('.TranscriptionStatusUpdated', (data: { vuid: string; status: string }) => {
            if (data.status === 'processing') {
                dispatch(toastActions.addToast({
                    message: t('video.transcription_started_toast'),
                    type: ToastType.INFO,
                }));
            } else if (data.status === 'completed') {
                dispatch(toastActions.addToast({
                    message: t('video.transcription_completed_toast'),
                    type: ToastType.SUCCESS,
                }));
            } else if (data.status === 'failed') {
                dispatch(toastActions.addToast({
                    message: t('video.transcription_failed_toast'),
                    type: ToastType.ERROR,
                }));
            }
        });

        return () => {
            echo.leave(`users.${user.uuid}`);
        };
    }, [dispatch, user]);

    useEffect(() => {
        return () => {
            if (user === null) {
                destroyEcho();
            }
        };
    }, [user]);
}

function formatNotificationMessage(notification: Notification): string {
    const data = notification.data;
    switch (notification.type) {
        case NotificationType.COMMENT_REPLIED: return `${String(data.replier_name)} replied to your comment`;
        case NotificationType.COMMENT_LIKED: return `${String(data.liker_name)} liked your comment`;
        case NotificationType.VIDEO_LIKED: return `${String(data.liker_name)} liked your video`;
        case NotificationType.NEW_SUBSCRIBER: return `${String(data.subscriber_name)} subscribed to your channel`;
        case NotificationType.VIDEO_FROM_SUBSCRIPTION: return `New video: ${String(data.title)}`;
        case NotificationType.VIDEO_PROCESSED: {
            const isFailed = data.failed === true;
            return isFailed
                ? `Video processing failed: "${String(data.video_title)}"`
                : `Your video "${String(data.video_title)}" is now live`;
        }
        case NotificationType.VIDEO_TRANSCRIBED: return `Transcription ready: "${String(data.video_title)}"`;
    }
}
