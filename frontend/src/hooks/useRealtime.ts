import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store/index';
import { selectAuthUser } from '@store/authSelectors';
import { notificationsActions } from '@store/notificationsSlice';
import { toastActions } from '@store/toastSlice';
import { videoActions } from '@store/videoSlice';
import { notifications as notificationsApi, video as videoApi } from '@api';
import type { AppNotification as Notification, Vuid } from '@api';
import { NotificationType } from '@enums/notificationType';
import { getEcho, destroyEcho } from '@lib/echo';
import { playNotificationSound } from '@utils';
import { ToastType } from '@enums/toastType';
import { VideoStatus } from '@models';
import type { Video } from '@models';
import type { Toast } from '@store/toastSlice';

export function useRealtime(): void {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const location = useLocation();
    const locationRef = useRef(location);
    useLayoutEffect(() => {
        locationRef.current = location;
    });
    const videos = useAppSelector(state => state.video.videos);
    const videosRef = useRef<Video[]>(videos);
    useLayoutEffect(() => {
        videosRef.current = videos;
    });

    // Every realtime notification toast also plays the notification sound,
    // regardless of which broadcast handler produced it.
    const notify = useCallback((toast: Omit<Toast, 'id'>) => {
        dispatch(toastActions.addToast(toast));
        void playNotificationSound();
    }, [dispatch]);

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

                if (notification.type === NotificationType.VIDEO_AI_SUMMARY_READY) {
                    const vuid = notification.data.vuid as string | undefined;
                    const currentVuid = new URLSearchParams(locationRef.current.search).get('v');
                    const isCurrentlyWatching = vuid !== undefined && vuid === currentVuid;

                    // VideoPage handles its own updates via useVideoFetch/useVideoContent.
                    // Dispatching updateVideo here would cause a spurious re-render and
                    // briefly re-trigger related video logic on the currently open page.
                    if (vuid && !isCurrentlyWatching) {
                        void videoApi.get(vuid as Vuid).then(result => {
                            if (result.ok) {
                                dispatch(videoActions.updateVideo(result.data));
                            }
                        });
                    }
                }

                const hasDedicatedBroadcastHandler = BROADCAST_HANDLED_TYPES.has(notification.type);

                if (!hasDedicatedBroadcastHandler) {
                    const thumbnail = notification.data.thumbnail_url as string | undefined;
                    const subtitle = notification.data.video_title as string | undefined;
                    notify({
                        message: formatNotificationMessage(notification, t),
                        type: ToastType.INFO,
                        thumbnail: thumbnail ?? undefined,
                        subtitle,
                    });
                }
            });

            channel.listen('.VideoStatusUpdated', (data: { vuid: string; status: string }) => {
                dispatch(videoActions.updateVideoStatus({ vuid: data.vuid, status: data.status }));

                const isTerminalStatus = data.status !== VideoStatus.PROCESSING;

                if (isTerminalStatus) {
                    videoApi.get(data.vuid as Vuid).then(result => {
                        if (result.ok) {
                            dispatch(videoActions.updateVideo(result.data));
                        }
                    });
                }

                if (data.status === VideoStatus.PROCESSING) {
                    const video = videosRef.current.find(v => v.videoUrl?.includes(data.vuid));
                    notify({
                        message: t('video.processing_toast'),
                        type: ToastType.INFO,
                        thumbnail: video?.thumbnail,
                        subtitle: video?.title,
                    });
                }
            });

            channel.listen('.TranscriptionStatusUpdated', (data: { vuid: string; status: string }) => {
                const video = videosRef.current.find(v => v.videoUrl?.includes(data.vuid));
                const thumbnail = video?.thumbnail;
                const subtitle = video?.title;

                if (data.status === 'processing') {
                    notify({
                        message: t('video.transcription_started_toast'),
                        type: ToastType.INFO,
                        thumbnail,
                        subtitle,
                    });
                } else if (data.status === 'completed') {
                    notify({
                        message: t('video.transcription_completed_toast'),
                        type: ToastType.SUCCESS,
                        thumbnail,
                        subtitle,
                    });
                } else if (data.status === 'failed') {
                    notify({
                        message: t('video.transcription_failed_toast'),
                        type: ToastType.ERROR,
                        thumbnail,
                        subtitle,
                    });
                }
            });

            channel.listen('.AiSuggestionReady', (payload: { vuid: string; title: string }) => {
                const video = videosRef.current.find(v => v.videoUrl?.includes(payload.vuid));
                notify({
                    message: t('ai_suggestion.pending_toast', { title: payload.title }),
                    type: ToastType.SUCCESS,
                    thumbnail: video?.thumbnail,
                    subtitle: video?.title,
                });
            });
        });

        return () => {
            isCancelled = true;
            void getEcho().then(echo => echo?.leave(`users.${user.uuid}`));
        };
    }, [dispatch, user, t, notify]);

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
    // AI summary toast is shown by the .AiSuggestionReady listener (single uploads);
    // batch uploads still get the persisted bell entry, just no toast.
    NotificationType.VIDEO_AI_SUMMARY_READY,
]);

const NOTIFICATION_CLASS_MAP: Record<string, NotificationType> = {
    'App\\Notifications\\VideoProcessedNotification': NotificationType.VIDEO_PROCESSED,
    'App\\Notifications\\VideoTranscribedNotification': NotificationType.VIDEO_TRANSCRIBED,
    'App\\Notifications\\VideoTranscriptionStartedNotification': NotificationType.VIDEO_TRANSCRIPTION_STARTED,
    'App\\Notifications\\VideoAiSummaryReadyNotification': NotificationType.VIDEO_AI_SUMMARY_READY,
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
        /* v8 ignore next 2 */
        case NotificationType.VIDEO_TRANSCRIBED: return t('notifications.types.video_transcribed');
        case NotificationType.VIDEO_TRANSCRIPTION_STARTED: return t('notifications.types.video_transcription_started');
    }
}
