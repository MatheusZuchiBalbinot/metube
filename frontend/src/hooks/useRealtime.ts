import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store/index';
import { selectAuthUser } from '@store/authSelectors';
import { notificationsActions } from '@store/notificationsSlice';
import { toastActions } from '@store/toastSlice';
import { videoActions } from '@store/videoSlice';
import { selectAllVideos } from '@store/videoSelectors';
import { notifications as notificationsApi, video as videoApi } from '@api';
import type { AppNotification as Notification, Vuid } from '@api';
import { NotificationType } from '@enums/notificationType';
import { getEcho, destroyEcho } from '@lib/echo';
import { playNotificationSound } from '@utils';
import { ToastType } from '@enums/toastType';
import { VideoStatus } from '@models';
import type { Video, VideoId } from '@models';
import type { Toast } from '@store/toastSlice';

interface VideoStatusEvent {
    vuid: string
    status: string
}

interface TranscriptionStatusEvent {
    vuid: string
    status: string
}

interface AiSuggestionEvent {
    vuid: string
    title: string
}

export function useRealtime(): void {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const location = useLocation();
    const locationRef = useRef(location);
    useLayoutEffect(() => {
        locationRef.current = location;
    });
    const videos = useAppSelector(selectAllVideos);
    const videosRef = useRef<Video[]>(videos);
    useLayoutEffect(() => {
        videosRef.current = videos;
    });
    // Keep `t` in a ref so changing the translation function (e.g. language
    // switch, re-renders) never tears down and rebuilds the Echo subscription.
    const tRef = useRef(t);
    useLayoutEffect(() => {
        tRef.current = t;
    });

    // Subscribe per stable user identity, not per user-object reference —
    // otherwise any auth re-fetch (fetchMe, profile edit) would churn the
    // WebSocket and drop in-flight notifications.
    const userUuid = user?.uuid ?? null;

    // Every realtime notification toast also plays the notification sound,
    // regardless of which broadcast handler produced it.
    const notify = useCallback((toast: Omit<Toast, 'id'>) => {
        dispatch(toastActions.addToast(toast));
        void playNotificationSound();
    }, [dispatch]);

    useEffect(() => {
        if (userUuid === null) {
            return;
        }

        const fetchInitialCount = async (): Promise<void> => {
            const count = await notificationsApi.unreadCount();
            dispatch(notificationsActions.setUnreadCount(count));
        };

        void fetchInitialCount();

        let isCancelled = false;
        // Captured inside the promise so cleanup leaves the exact channel that
        // was subscribed, without resolving getEcho() a second time.
        let activeEcho: Awaited<ReturnType<typeof getEcho>> = null;

        // Exact id match — a substring check here previously matched the wrong
        // video whenever one vuid happened to contain another.
        function findVideoByVuid(vuid: string): Video | undefined {
            return videosRef.current.find(v => v.id === (vuid as unknown as VideoId));
        }

        function refreshVideoOnAiSummaryReady(notification: Notification): void {
            if (notification.type !== NotificationType.VIDEO_AI_SUMMARY_READY) {
                return;
            }

            const vuid = notification.data.vuid as string | undefined;
            const currentVuid = new URLSearchParams(locationRef.current.search).get('v');
            const isCurrentlyWatching = vuid !== undefined && vuid === currentVuid;

            // VideoPage handles its own updates via useVideoFetch/useVideoContent.
            // Dispatching updateVideo here would cause a spurious re-render and
            // briefly re-trigger related video logic on the currently open page.
            if (!vuid || isCurrentlyWatching) {
                return;
            }

            void videoApi.get(vuid as Vuid).then(result => {
                if (result.ok) {
                    dispatch(videoActions.updateVideo(result.data));
                }
            });
        }

        function handleNotification(payload: Record<string, unknown>): void {
            const notification = normalizeBroadcastNotification(payload);

            if (notification === null) {
                return;
            }

            dispatch(notificationsActions.addNotification(notification));
            refreshVideoOnAiSummaryReady(notification);

            const hasDedicatedBroadcastHandler = BROADCAST_HANDLED_TYPES.has(notification.type);

            if (hasDedicatedBroadcastHandler) {
                return;
            }

            const thumbnail = notification.data.thumbnail_url as string | undefined;
            const subtitle = notification.data.video_title as string | undefined;

            notify({
                message: formatNotificationMessage(notification, tRef.current),
                type: ToastType.INFO,
                thumbnail: thumbnail ?? undefined,
                subtitle,
            });
        }

        function handleVideoStatus(data: VideoStatusEvent): void {
            dispatch(videoActions.updateVideoStatus({ vuid: data.vuid as Vuid, status: data.status as VideoStatus }));

            const isTerminalStatus = data.status !== VideoStatus.PROCESSING;

            if (isTerminalStatus) {
                videoApi.get(data.vuid as Vuid).then(result => {
                    if (result.ok) {
                        dispatch(videoActions.updateVideo(result.data));
                    }
                });
            }

            const isProcessing = data.status === VideoStatus.PROCESSING;

            if (!isProcessing) {
                return;
            }

            const video = findVideoByVuid(data.vuid);

            notify({
                message: tRef.current('video.processing_toast'),
                type: ToastType.INFO,
                thumbnail: video?.thumbnail,
                subtitle: video?.title,
            });
        }

        function handleTranscriptionStatus(data: TranscriptionStatusEvent): void {
            const toastConfig = TRANSCRIPTION_TOAST[data.status];

            if (toastConfig === undefined) {
                return;
            }

            const video = findVideoByVuid(data.vuid);

            notify({
                message: tRef.current(toastConfig.key),
                type: toastConfig.type,
                thumbnail: video?.thumbnail,
                subtitle: video?.title,
            });
        }

        function handleAiSuggestion(payload: AiSuggestionEvent): void {
            const video = findVideoByVuid(payload.vuid);

            notify({
                message: tRef.current('ai_suggestion.pending_toast', { title: payload.title }),
                type: ToastType.SUCCESS,
                thumbnail: video?.thumbnail,
                subtitle: video?.title,
            });
        }

        void getEcho().then(echo => {
            if (isCancelled || echo === null) {
                return;
            }

            activeEcho = echo;

            const channel = echo.private(`users.${userUuid}`);

            channel.notification(handleNotification);
            channel.listen('.VideoStatusUpdated', handleVideoStatus);
            channel.listen('.TranscriptionStatusUpdated', handleTranscriptionStatus);
            channel.listen('.AiSuggestionReady', handleAiSuggestion);
        });

        return () => {
            isCancelled = true;
            // Leave only this user's channel; never destroy the singleton here —
            // the logout effect below owns teardown. Switching users would
            // otherwise leak the previous private subscription.
            activeEcho?.leave(`users.${userUuid}`);
        };
    }, [dispatch, userUuid, notify]);

    useEffect(() => {
        if (userUuid === null) {
            return;
        }

        return () => {
            destroyEcho();
        };
    }, [userUuid]);
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

// Lookup table replacing an if/else-if chain over `data.status` — adding a
// new transcription status means adding a row here, not another branch.
const TRANSCRIPTION_TOAST: Record<string, { key: string; type: ToastType }> = {
    processing: { key: 'video.transcription_started_toast', type: ToastType.INFO },
    completed: { key: 'video.transcription_completed_toast', type: ToastType.SUCCESS },
    failed: { key: 'video.transcription_failed_toast', type: ToastType.ERROR },
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
        default: return '';
    }
}
