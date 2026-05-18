import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store/index';
import { notificationsActions } from '@store/notificationsSlice';
import { toastActions } from '@store/toastSlice';
import { videoActions } from '@store/videoSlice';
import { notifications as notificationsApi } from '@api/notifications';
import type { Notification } from '@api/notifications';
import { NotificationType } from '@enums/notificationType';
import { getEcho, destroyEcho } from '@lib/echo';
import { playNotificationSound } from '@utils/notificationSound';
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

        let isCancelled = false;

        void getEcho().then(echo => {
            if (isCancelled || echo === null) {
                return;
            }

            const channel = echo.private(`users.${user.uuid}`);

            channel.notification((payload: Record<string, unknown>) => {
                const notification = normalizeBroadcastNotification(payload);

                if (notification === null) {
                    return;
                }

                dispatch(notificationsActions.addNotification(notification));
                const hasDedicatedBroadcastHandler = BROADCAST_HANDLED_TYPES.has(notification.type);

                if (!hasDedicatedBroadcastHandler) {
                    dispatch(toastActions.addToast({
                        message: formatNotificationMessage(notification, t),
                        type: ToastType.INFO,
                    }));
                    void playNotificationSound();
                }
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
        });

        return () => {
            isCancelled = true;
            void getEcho().then(echo => echo?.leave(`users.${user.uuid}`));
        };
    }, [dispatch, user, t]);

    useEffect(() => {
        const isLoggedIn = user !== null;

        if (!isLoggedIn) {
            return;
        }

        return () => {
            destroyEcho();
        };
    }, [user]);
}

const BROADCAST_HANDLED_TYPES = new Set<NotificationType>([
    NotificationType.VIDEO_TRANSCRIBED,
    NotificationType.VIDEO_TRANSCRIPTION_STARTED,
]);

const NOTIFICATION_CLASS_MAP: Record<string, NotificationType> = {
    'App\\Notifications\\VideoProcessedNotification': NotificationType.VIDEO_PROCESSED,
    'App\\Notifications\\VideoTranscribedNotification': NotificationType.VIDEO_TRANSCRIBED,
    'App\\Notifications\\VideoTranscriptionStartedNotification': NotificationType.VIDEO_TRANSCRIPTION_STARTED,
    'App\\Notifications\\VideoFromSubscriptionNotification': NotificationType.VIDEO_FROM_SUBSCRIPTION,
    'App\\Notifications\\VideoLikedNotification': NotificationType.VIDEO_LIKED,
    'App\\Notifications\\NewSubscriberNotification': NotificationType.NEW_SUBSCRIBER,
    'App\\Notifications\\CommentRepliedNotification': NotificationType.COMMENT_REPLIED,
    'App\\Notifications\\CommentLikedNotification': NotificationType.COMMENT_LIKED,
};

function normalizeBroadcastNotification(payload: Record<string, unknown>): Notification | null {
    const { id, type: phpClass, notifiable_id: _nid, notifiable_type: _ntype, ...data } = payload;
    const type = NOTIFICATION_CLASS_MAP[phpClass as string];

    if (type === undefined) {
        return null;
    }

    return {
        id: id as string,
        type,
        data: data as Record<string, unknown>,
        read_at: null,
        created_at: new Date().toISOString(),
    };
}

function formatNotificationMessage(
    notification: Notification,
    t: (key: string, vars?: Record<string, unknown>) => string,
): string {
    const data = notification.data;

    switch (notification.type) {
        case NotificationType.COMMENT_REPLIED: return t('notifications.types.comment_replied', { name: data.replier_name });
        case NotificationType.COMMENT_LIKED: return t('notifications.types.comment_liked', { name: data.liker_name });
        case NotificationType.VIDEO_LIKED: return t('notifications.types.video_liked', { name: data.liker_name });
        case NotificationType.NEW_SUBSCRIBER: return t('notifications.types.new_subscriber', { name: data.subscriber_name });
        case NotificationType.VIDEO_FROM_SUBSCRIPTION: return t('notifications.types.video_from_subscription', { channel: data.channel_name });
        case NotificationType.VIDEO_PROCESSED: {
            const isFailed = data.failed === true;
            return isFailed
                ? t('notifications.types.video_processed_failed')
                : t('notifications.types.video_processed');
        }
        case NotificationType.VIDEO_TRANSCRIBED: return t('notifications.types.video_transcribed');
        case NotificationType.VIDEO_TRANSCRIPTION_STARTED: return t('notifications.types.video_transcription_started');
    }
}
