import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquareReply, Heart, UserPlus, Video, Clapperboard, Captions, Mic } from 'lucide-react';
import type { Notification } from '@api/notifications';
import { NotificationType } from '@enums/notificationType';
import { videoUrl } from '@utils/routes';
import { Format } from '@utils/format';
import './item.css';

interface NotificationItemProps {
    notification: Notification
    onRead: (id: string) => void
}

function getIcon(type: NotificationType): React.ReactNode {
    switch (type) {
        case NotificationType.COMMENT_REPLIED: return <MessageSquareReply size={15} />;
        case NotificationType.COMMENT_LIKED: return <Heart size={15} />;
        case NotificationType.VIDEO_LIKED: return <Heart size={15} />;
        case NotificationType.NEW_SUBSCRIBER: return <UserPlus size={15} />;
        case NotificationType.VIDEO_FROM_SUBSCRIPTION: return <Video size={15} />;
        case NotificationType.VIDEO_PROCESSED: return <Clapperboard size={15} />;
        case NotificationType.VIDEO_TRANSCRIPTION_STARTED: return <Mic size={15} />;
        case NotificationType.VIDEO_TRANSCRIBED: return <Captions size={15} />;
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
    }
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isUnread = notification.read_at === null;
    const text = getText(notification.type, notification.data, t);
    const subtitle = notification.data.video_title as string | undefined;

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
            <span className="notification-item__icon">
                {getIcon(notification.type)}
            </span>
            <span className="notification-item__body">
                <span className="notification-item__text">{text}</span>
                {subtitle !== undefined && (
                    <span className="notification-item__subtitle">{subtitle}</span>
                )}
                <span className="notification-item__time">
                    {Format.relativeDate(notification.created_at, i18n.language)}
                </span>
            </span>
            {isUnread && <span className="notification-item__dot" aria-hidden="true" />}
        </button>
    );
}
