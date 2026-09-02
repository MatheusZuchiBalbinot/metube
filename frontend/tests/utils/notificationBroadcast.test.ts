import { describe, it, expect, vi } from 'vitest';
import { NotificationType } from '@enums/notificationType';
import {
    BROADCAST_HANDLED_TYPES,
    formatNotificationMessage,
    normalizeBroadcastNotification,
} from '@utils/notificationBroadcast';

describe('normalizeBroadcastNotification', () => {
    it('maps a known notification class to its NotificationType', () => {
        const result = normalizeBroadcastNotification({
            id: 'n-1',
            type: 'App\\Notifications\\VideoLikedNotification',
            notifiable_id: 'ignored',
            notifiable_type: 'ignored',
            liker_name: 'Alice',
        });

        expect(result).not.toBeNull();
        expect(result?.type).toBe(NotificationType.VIDEO_LIKED);
        expect(result?.data).toEqual({ liker_name: 'Alice' });
    });

    it('returns null for an unknown notification class', () => {
        const result = normalizeBroadcastNotification({
            id: 'n-2',
            type: 'App\\Notifications\\UnknownNotification',
        });

        expect(result).toBeNull();
    });
});

describe('formatNotificationMessage', () => {
    const t = vi.fn((key: string) => key);

    it('formats a message using the type-specific formatter', () => {
        const notification = {
            id: 'n-1',
            type: NotificationType.COMMENT_LIKED,
            data: { liker_name: 'Bob' },
            read_at: null,
            created_at: new Date().toISOString(),
        };

        formatNotificationMessage(notification, t);

        expect(t).toHaveBeenCalledWith('notifications.types.comment_liked', { name: 'Bob' });
    });

    it('returns an empty string when no formatter is registered for the type', () => {
        const notification = {
            id: 'n-2',
            type: NotificationType.VIDEO_AI_SUMMARY_READY,
            data: {},
            read_at: null,
            created_at: new Date().toISOString(),
        };

        expect(formatNotificationMessage(notification, t)).toBe('');
    });
});

describe('BROADCAST_HANDLED_TYPES', () => {
    it('excludes types with a dedicated broadcast toast from the generic notification toast', () => {
        expect(BROADCAST_HANDLED_TYPES.has(NotificationType.VIDEO_TRANSCRIBED)).toBe(true);
        expect(BROADCAST_HANDLED_TYPES.has(NotificationType.VIDEO_TRANSCRIPTION_STARTED)).toBe(true);
        expect(BROADCAST_HANDLED_TYPES.has(NotificationType.VIDEO_AI_SUMMARY_READY)).toBe(true);
        expect(BROADCAST_HANDLED_TYPES.has(NotificationType.VIDEO_LIKED)).toBe(false);
    });
});
