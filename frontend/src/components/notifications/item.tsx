import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X } from '@components/icons/icons';
import { Avatar } from '@ui';
import type { AppNotification as Notification } from '@api';
import { NotificationType } from '@enums/notificationType';
import { formatRelativeDate, cn, isActivationKey } from '@utils';
import { getCategory, getActorName, getBadgeMeta, getActionLabelKey, getDestination, isAiSummary } from './meta';
import './item.css';

interface NotificationItemProps {
    notification: Notification
    onRead: (id: string) => void
    onDismiss: (id: string) => void
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
        case NotificationType.VIDEO_PROCESSED: {
            const isFailed = data.failed === true;
            return isFailed
                ? t('notifications.types.video_processed_failed')
                : t('notifications.types.video_processed');
        }
        case NotificationType.VIDEO_TRANSCRIPTION_STARTED:
            return t('notifications.types.video_transcription_started');
        case NotificationType.VIDEO_TRANSCRIBED:
            return t('notifications.types.video_transcribed');
        case NotificationType.VIDEO_AI_SUMMARY_READY:
            return t('notifications.types.video_ai_summary_ready');
    }
}

function NotificationItem({ notification, onRead, onDismiss }: NotificationItemProps) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const isUnread = notification.read_at === null;
    const text = getText(notification.type, notification.data, t);
    const subtitle = notification.data.video_title as string | undefined;
    const thumbUrl = notification.data.thumbnail_url;
    const thumbnail = typeof thumbUrl === 'string' ? thumbUrl : undefined;

    const actorName = getActorName(notification);
    const { Icon, variant } = getBadgeMeta(notification.type);
    const dest = getDestination(notification);
    const isAi = isAiSummary(notification.type);
    const actionLabelKey = getActionLabelKey(notification.type);

    const showActor = getCategory(notification.type) === 'social' && actorName !== null;
    const showAction = dest !== null && actionLabelKey !== null;

    function activate(): void {
        onRead(notification.id);

        if (dest !== null) {
            navigate(dest);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent): void {
        if (!isActivationKey(e)) {
            return;
        }

        e.preventDefault();
        activate();
    }

    function handleDismiss(e: React.MouseEvent): void {
        e.stopPropagation();
        onDismiss(notification.id);
    }

    function handleAction(e: React.MouseEvent): void {
        e.stopPropagation();
        activate();
    }

    return (
        <div
            className={cn('notification-item', isUnread && 'notification-item--unread', isAi && 'notification-item--ai')}
            role="button"
            tabIndex={0}
            onClick={activate}
            onKeyDown={handleKeyDown}
        >
            <span className="notification-item__lead">
                {showActor && actorName !== null
                    ? <Avatar name={actorName} size="md" />
                    : (
                        <span className={`notification-item__icon notification-item__icon--${variant}`}>
                            <Icon size={16} />
                        </span>
                    )}
                {showActor && (
                    <span className={`notification-item__badge notification-item__badge--${variant}`} aria-hidden="true">
                        <Icon size={10} strokeWidth={2.5} />
                    </span>
                )}
            </span>

            <span className="notification-item__body">
                <span className="notification-item__text">{text}</span>
                {subtitle !== undefined && (
                    <span className="notification-item__subtitle">{subtitle}</span>
                )}
                <span className="notification-item__time">
                    {formatRelativeDate(notification.created_at, i18n.language)}
                </span>
                {showAction && (
                    <button type="button" className="notification-item__action" onClick={handleAction}>
                        {t(actionLabelKey)}
                    </button>
                )}
            </span>

            {thumbnail !== undefined && (
                <img className="notification-item__thumb" src={thumbnail} alt="" aria-hidden="true" />
            )}

            <button
                type="button"
                className="notification-item__dismiss"
                onClick={handleDismiss}
                aria-label={t('notifications.actions.dismiss')}
            >
                <X size={14} />
            </button>
        </div>
    );
}

export default React.memo(NotificationItem);
