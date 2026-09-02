import { NotificationType } from '@enums/notificationType';
import type { AppNotification as Notification } from '@api';

export const NOTIFICATION_CLASS_MAP: Record<string, NotificationType> = {
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

// Types with a dedicated broadcast toast — the generic notification toast skips these.
export const BROADCAST_HANDLED_TYPES = new Set<NotificationType>([
    NotificationType.VIDEO_TRANSCRIBED,
    NotificationType.VIDEO_TRANSCRIPTION_STARTED,
    NotificationType.VIDEO_AI_SUMMARY_READY,
]);

export function normalizeBroadcastNotification(payload: Record<string, unknown>): Notification | null {
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

type Translate = (key: string, vars?: Record<string, unknown>) => string;
type NotificationFormatterFn = (data: Record<string, unknown>, t: Translate) => string;

function formatVideoProcessedMessage(data: Record<string, unknown>, t: Translate): string {
    const isFailed = data.failed === true;
    return isFailed
        ? t('notifications.types.video_processed_failed')
        : t('notifications.types.video_processed');
}

const NOTIFICATION_MESSAGE_FORMATTERS: Partial<Record<NotificationType, NotificationFormatterFn>> = {
    [NotificationType.COMMENT_REPLIED]: (data, t) => t('notifications.types.comment_replied', { name: data.replier_name }),
    [NotificationType.COMMENT_LIKED]: (data, t) => t('notifications.types.comment_liked', { name: data.liker_name }),
    [NotificationType.VIDEO_LIKED]: (data, t) => t('notifications.types.video_liked', { name: data.liker_name }),
    [NotificationType.NEW_SUBSCRIBER]: (data, t) => t('notifications.types.new_subscriber', { name: data.subscriber_name }),
    [NotificationType.VIDEO_FROM_SUBSCRIPTION]: (data, t) => t('notifications.types.video_from_subscription', { channel: data.channel_name }),
    [NotificationType.VIDEO_PROCESSED]: formatVideoProcessedMessage,
    /* v8 ignore next 2 */
    [NotificationType.VIDEO_TRANSCRIBED]: (_data, t) => t('notifications.types.video_transcribed'),
    [NotificationType.VIDEO_TRANSCRIPTION_STARTED]: (_data, t) => t('notifications.types.video_transcription_started'),
};

export function formatNotificationMessage(notification: Notification, t: Translate): string {
    const formatter = NOTIFICATION_MESSAGE_FORMATTERS[notification.type];

    if (formatter === undefined) {
        return '';
    }

    return formatter(notification.data, t);
}
