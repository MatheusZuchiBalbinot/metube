import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquareReply, Heart, Bell, Video } from 'lucide-react';
import type { Notification } from '@api/notifications';
import { NotificationType } from '@enums/notificationType';
import { videoUrl } from '@utils/routes';
import './item.css';

interface NotificationItemProps {
    notification: Notification
    onRead: (id: string) => void
}

function getIcon(type: NotificationType): React.ReactNode {
    switch (type) {
        case NotificationType.COMMENT_REPLIED: return <MessageSquareReply size={16} />;
        case NotificationType.COMMENT_LIKED: return <Heart size={16} />;
        case NotificationType.VIDEO_LIKED: return <Heart size={16} />;
        case NotificationType.NEW_SUBSCRIBER: return <Bell size={16} />;
        case NotificationType.VIDEO_FROM_SUBSCRIPTION: return <Video size={16} />;
    }
}

function getDestination(notification: Notification): string | null {
    const { data } = notification;
    const vuid = data.vuid as string | undefined;
    if (vuid) {
        return videoUrl(vuid);
    }
    return null;
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isUnread = notification.read_at === null;

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
            aria-label={t(`notifications.types.${notification.type}`, notification.type)}
        >
            <span className="notification-item__icon">{getIcon(notification.type)}</span>
            <span className="notification-item__body">
                <span className="notification-item__text">{t(`notifications.types.${notification.type}`, notification.type)}</span>
                <span className="notification-item__meta">{new Date(notification.created_at).toLocaleDateString()}</span>
            </span>
            {isUnread && <span className="notification-item__dot" aria-hidden="true" />}
        </button>
    );
}
