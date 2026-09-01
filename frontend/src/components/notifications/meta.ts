import { MessageSquareReply, Heart, UserPlus, Video, Clapperboard, Captions, Mic, Sparkles } from '@components/icons/icons';
import type { LucideIcon } from '@components/icons/icons';
import type { AppNotification as Notification } from '@api';
import { NotificationType } from '@enums/notificationType';
import { videoUrl } from '@utils';

export type NotificationCategory = 'social' | 'video';

export type BadgeVariant = 'like' | 'reply' | 'subscriber' | 'video' | 'success' | 'ai' | 'default';

interface BadgeMeta {
    Icon: LucideIcon
    variant: BadgeVariant
}

const SOCIAL_TYPES = new Set<NotificationType>([
    NotificationType.COMMENT_REPLIED,
    NotificationType.COMMENT_LIKED,
    NotificationType.VIDEO_LIKED,
    NotificationType.NEW_SUBSCRIBER,
    NotificationType.VIDEO_FROM_SUBSCRIPTION,
]);

const ACTOR_FIELDS: Partial<Record<NotificationType, string>> = {
    [NotificationType.COMMENT_REPLIED]: 'replier_name',
    [NotificationType.COMMENT_LIKED]: 'liker_name',
    [NotificationType.VIDEO_LIKED]: 'liker_name',
    [NotificationType.NEW_SUBSCRIBER]: 'subscriber_name',
    [NotificationType.VIDEO_FROM_SUBSCRIPTION]: 'channel_name',
};

const BADGE_META: Record<NotificationType, BadgeMeta> = {
    [NotificationType.COMMENT_REPLIED]: { Icon: MessageSquareReply, variant: 'reply' },
    [NotificationType.COMMENT_LIKED]: { Icon: Heart, variant: 'like' },
    [NotificationType.VIDEO_LIKED]: { Icon: Heart, variant: 'like' },
    [NotificationType.NEW_SUBSCRIBER]: { Icon: UserPlus, variant: 'subscriber' },
    [NotificationType.VIDEO_FROM_SUBSCRIPTION]: { Icon: Video, variant: 'video' },
    [NotificationType.VIDEO_PROCESSED]: { Icon: Clapperboard, variant: 'success' },
    [NotificationType.VIDEO_TRANSCRIPTION_STARTED]: { Icon: Mic, variant: 'default' },
    [NotificationType.VIDEO_TRANSCRIBED]: { Icon: Captions, variant: 'default' },
    [NotificationType.VIDEO_AI_SUMMARY_READY]: { Icon: Sparkles, variant: 'ai' },
};

const ACTION_LABEL_KEYS: Partial<Record<NotificationType, string>> = {
    [NotificationType.COMMENT_REPLIED]: 'notifications.actions.view_comment',
    [NotificationType.COMMENT_LIKED]: 'notifications.actions.view_comment',
    [NotificationType.VIDEO_LIKED]: 'notifications.actions.watch',
    [NotificationType.VIDEO_FROM_SUBSCRIPTION]: 'notifications.actions.watch',
    [NotificationType.VIDEO_PROCESSED]: 'notifications.actions.watch',
    [NotificationType.VIDEO_TRANSCRIPTION_STARTED]: 'notifications.actions.watch',
    [NotificationType.VIDEO_TRANSCRIBED]: 'notifications.actions.watch',
    [NotificationType.VIDEO_AI_SUMMARY_READY]: 'notifications.actions.read_summary',
};

export function getCategory(type: NotificationType): NotificationCategory {
    return SOCIAL_TYPES.has(type) ? 'social' : 'video';
}

/** Name of the person/channel that triggered the notification, or null for system events. */
export function getActorName(notification: Notification): string | null {
    const field = ACTOR_FIELDS[notification.type];

    if (field === undefined) {
        return null;
    }

    const value = notification.data[field];
    return typeof value === 'string' ? value : null;
}

export function getBadgeMeta(type: NotificationType): BadgeMeta {
    return BADGE_META[type];
}

/** i18n key for the contextual primary action, or null when there's no destination to act on. */
export function getActionLabelKey(type: NotificationType): string | null {
    return ACTION_LABEL_KEYS[type] ?? null;
}

/** In-app route the notification points to, or null when it isn't navigable. */
export function getDestination(notification: Notification): string | null {
    const vuid = notification.data.vuid;

    if (typeof vuid !== 'string') {
        return null;
    }

    return videoUrl(vuid);
}

/** The AI-summary-ready notification gets a dedicated, highlighted card. */
export function isAiSummary(type: NotificationType): boolean {
    return type === NotificationType.VIDEO_AI_SUMMARY_READY;
}
