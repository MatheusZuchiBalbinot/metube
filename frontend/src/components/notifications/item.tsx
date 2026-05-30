import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquareReply, Heart, UserPlus, Video, Clapperboard, Captions, Mic, Sparkles } from 'lucide-react';
import type { AppNotification as Notification } from '@api';
import { NotificationType } from '@enums/notificationType';
import { videoUrl, formatRelativeDate } from '@utils';
import { useAppSelector } from '@store';
import './item.css';

const VIDEO_NOTIFICATION_TYPES = new Set<NotificationType>([
    NotificationType.VIDEO_LIKED,
    NotificationType.VIDEO_FROM_SUBSCRIPTION,
    NotificationType.VIDEO_PROCESSED,
    NotificationType.VIDEO_TRANSCRIPTION_STARTED,
    NotificationType.VIDEO_TRANSCRIBED,
    NotificationType.VIDEO_AI_SUMMARY_READY,
    NotificationType.COMMENT_REPLIED,
    NotificationType.COMMENT_LIKED,
]);

interface NotificationItemProps {
    notification: Notification
    onRead: (id: string) => void
}

function getIcon(type: NotificationType): React.ReactNode {
    switch (type) {
        case NotificationType.COMMENT_REPLIED: return <MessageSquareReply size={14} />;
        case NotificationType.COMMENT_LIKED: return <Heart size={14} />;
        case NotificationType.VIDEO_LIKED: return <Heart size={14} />;
        case NotificationType.NEW_SUBSCRIBER: return <UserPlus size={14} />;
        case NotificationType.VIDEO_FROM_SUBSCRIPTION: return <Video size={14} />;
        case NotificationType.VIDEO_PROCESSED: return <Clapperboard size={14} />;
        case NotificationType.VIDEO_TRANSCRIPTION_STARTED: return <Mic size={14} />;
        case NotificationType.VIDEO_TRANSCRIBED: return <Captions size={14} />;
        case NotificationType.VIDEO_AI_SUMMARY_READY: return <Sparkles size={14} />;
    }
}

function getIconVariant(type: NotificationType): string {
    switch (type) {
        case NotificationType.VIDEO_LIKED:
        case NotificationType.COMMENT_LIKED:
            return 'like';
        case NotificationType.VIDEO_AI_SUMMARY_READY:
            return 'ai';
        case NotificationType.VIDEO_PROCESSED:
            return 'success';
        default:
            return 'default';
    }
}

function getDestination(notification: Notification): string | null {
    const vuid = notification.data.vuid as string | undefined;
    if (vuid) {
        return videoUrl(vuid);
    }
    return null;
}

function getText(
    type: NotificationType,
    data: Record<string, unknown>,
    t: (key: string, vars?: Record<string, unknown>) => string,
): string {
    switch (type) {
        case NotificationType.COMMENT_REPLIED:
            return t('notifications.types.comment_replied', { name: data.replier_name });
        case NotificationType.COMMENT_LIKED:
            return t('notifications.types.comment_liked', { name: data.liker_name });
        case NotificationType.VIDEO_LIKED:
            return t('notifications.types.video_liked', { name: data.liker_name });
        case NotificationType.NEW_SUBSCRIBER:
            return t('notifications.types.new_subscriber', { name: data.subscriber_name });
        case NotificationType.VIDEO_FROM_SUBSCRIPTION:
            return t('notifications.types.video_from_subscription', { channel: data.channel_name });
        case NotificationType.VIDEO_PROCESSED:
            return t('notifications.types.video_processed');
        case NotificationType.VIDEO_TRANSCRIPTION_STARTED:
            return t('notifications.types.video_transcription_started');
        case NotificationType.VIDEO_TRANSCRIBED:
            return t('notifications.types.video_transcribed');
        case NotificationType.VIDEO_AI_SUMMARY_READY:
            return t('notifications.types.video_ai_summary_ready');
    }
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const videos = useAppSelector(s => s.video.videos);

    const isUnread = notification.read_at === null;
    const text = getText(notification.type, notification.data, t);
    const subtitle = notification.data.video_title as string | undefined;
    const vuid = notification.data.vuid as string | undefined;

    const isVideoType = VIDEO_NOTIFICATION_TYPES.has(notification.type);
    const payloadThumbnail = notification.data.thumbnail_url as string | undefined;
    const thumbnail = !isVideoType
        ? undefined
        : (payloadThumbnail ?? (vuid ? videos.find(v => v.videoUrl?.includes(vuid))?.thumbnail : undefined));

    function handleClick(): void {
        onRead(notification.id);
        const dest = getDestination(notification);
        if (dest) {
            navigate(dest);
        }
    }

    return (
        <button
            className={`notification-item${isUnread ? ' notification-item--unread' : ''}`}
            onClick={handleClick}
        >
            <span className={`notification-item__icon notification-item__icon--${getIconVariant(notification.type)}`}>
                {getIcon(notification.type)}
            </span>
            <span className="notification-item__body">
                <span className="notification-item__text">{text}</span>
                {subtitle !== undefined && (
                    <span className="notification-item__subtitle">{subtitle}</span>
                )}
                <span className="notification-item__time">
                    {formatRelativeDate(notification.created_at, i18n.language)}
                </span>
            </span>
            {thumbnail !== undefined && (
                <img
                    className="notification-item__thumb"
                    src={thumbnail}
                    alt=""
                    aria-hidden="true"
                />
            )}
            {isUnread && <span className="notification-item__dot" aria-hidden="true" />}
        </button>
    );
}
