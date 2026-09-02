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

type Translate = (key: string, vars?: Record<string, unknown>) => string;

function getVideoProcessedText(data: Record<string, unknown>, t: Translate): string {
    const isFailed = data.failed === true;

    return isFailed
        ? t('notifications.types.video_processed_failed')
        : t('notifications.types.video_processed');
}

const TEXT_RESOLVERS: Record<NotificationType, (data: Record<string, unknown>, t: Translate) => string> = {
    [NotificationType.COMMENT_REPLIED]: (data, t) => t('notifications.types.comment_replied', { name: data.replier_name }),
    [NotificationType.COMMENT_LIKED]: (data, t) => t('notifications.types.comment_liked', { name: data.liker_name }),
    [NotificationType.VIDEO_LIKED]: (data, t) => t('notifications.types.video_liked', { name: data.liker_name }),
    [NotificationType.NEW_SUBSCRIBER]: (data, t) => t('notifications.types.new_subscriber', { name: data.subscriber_name }),
    [NotificationType.VIDEO_FROM_SUBSCRIPTION]: (data, t) => t('notifications.types.video_from_subscription', { channel: data.channel_name }),
    [NotificationType.VIDEO_PROCESSED]: getVideoProcessedText,
    [NotificationType.VIDEO_TRANSCRIPTION_STARTED]: (_data, t) => t('notifications.types.video_transcription_started'),
    [NotificationType.VIDEO_TRANSCRIBED]: (_data, t) => t('notifications.types.video_transcribed'),
    [NotificationType.VIDEO_AI_SUMMARY_READY]: (_data, t) => t('notifications.types.video_ai_summary_ready'),
};

function getText(
    type: NotificationType,
    data: Record<string, unknown>,
    t: Translate,
): string {
    return TEXT_RESOLVERS[type](data, t);
}

function resolveNotificationItemClass(isUnread: boolean, isAi: boolean): string {
    return cn('notification-item', isUnread && 'notification-item--unread', isAi && 'notification-item--ai');
}

interface NotificationItemLeadProps {
    showActor: boolean
    actorName: string | null
    variant: string
    Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
}

function NotificationItemLead({ showActor, actorName, variant, Icon }: NotificationItemLeadProps) {
    return (
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
    );
}

interface NotificationItemBodyProps {
    text: string
    subtitle: string | undefined
    time: string
    showAction: boolean
    actionLabelKey: string | null
    onAction: (e: React.MouseEvent) => void
    t: Translate
}

function NotificationItemBody({ text, subtitle, time, showAction, actionLabelKey, onAction, t }: NotificationItemBodyProps) {
    return (
        <span className="notification-item__body">
            <span className="notification-item__text">{text}</span>
            {subtitle !== undefined && (
                <span className="notification-item__subtitle">{subtitle}</span>
            )}
            <span className="notification-item__time">
                {time}
            </span>
            {showAction && actionLabelKey !== null && (
                <button type="button" className="notification-item__action" onClick={onAction}>
                    {t(actionLabelKey)}
                </button>
            )}
        </span>
    );
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
            className={resolveNotificationItemClass(isUnread, isAi)}
            role="button"
            tabIndex={0}
            onClick={activate}
            onKeyDown={handleKeyDown}
        >
            <NotificationItemLead showActor={showActor} actorName={actorName} variant={variant} Icon={Icon} />

            <NotificationItemBody
                text={text}
                subtitle={subtitle}
                time={formatRelativeDate(notification.created_at, i18n.language)}
                showAction={showAction}
                actionLabelKey={actionLabelKey}
                onAction={handleAction}
                t={t}
            />

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
