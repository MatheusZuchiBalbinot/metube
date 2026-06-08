import { describe, it, expect } from 'vitest';
import type { AppNotification as Notification } from '@api';
import { NotificationType } from '@enums/notificationType';
import {
    getCategory,
    getActorName,
    getBadgeMeta,
    getActionLabelKey,
    getDestination,
    isAiSummary,
} from '@components/notifications/meta';

function makeNotification(
    type: NotificationType,
    data: Record<string, unknown> = {},
): Notification {
    return {
        id: 'n-1',
        type,
        data,
        read_at: null,
        created_at: '2026-06-07T12:00:00Z',
    };
}

describe('notifications/meta', () => {
    describe('getCategory', () => {
        it('buckets people-driven events as social', () => {
            expect(getCategory(NotificationType.COMMENT_REPLIED)).toBe('social');
            expect(getCategory(NotificationType.VIDEO_LIKED)).toBe('social');
            expect(getCategory(NotificationType.NEW_SUBSCRIBER)).toBe('social');
            expect(getCategory(NotificationType.VIDEO_FROM_SUBSCRIPTION)).toBe('social');
        });

        it('buckets own-pipeline events as video', () => {
            expect(getCategory(NotificationType.VIDEO_PROCESSED)).toBe('video');
            expect(getCategory(NotificationType.VIDEO_TRANSCRIBED)).toBe('video');
            expect(getCategory(NotificationType.VIDEO_AI_SUMMARY_READY)).toBe('video');
        });
    });

    describe('getActorName', () => {
        it('reads the type-specific actor field', () => {
            expect(getActorName(makeNotification(NotificationType.COMMENT_REPLIED, { replier_name: 'Ana' }))).toBe('Ana');
            expect(getActorName(makeNotification(NotificationType.VIDEO_LIKED, { liker_name: 'Bia' }))).toBe('Bia');
            expect(getActorName(makeNotification(NotificationType.VIDEO_FROM_SUBSCRIPTION, { channel_name: 'Canal' }))).toBe('Canal');
        });

        it('returns null for system events or missing names', () => {
            expect(getActorName(makeNotification(NotificationType.VIDEO_PROCESSED))).toBeNull();
            expect(getActorName(makeNotification(NotificationType.COMMENT_LIKED))).toBeNull();
        });
    });

    describe('getDestination', () => {
        it('points at the video page when a vuid is present', () => {
            const dest = getDestination(makeNotification(NotificationType.VIDEO_LIKED, { vuid: 'abc123' }));
            expect(dest).toContain('abc123');
        });

        it('returns null without a vuid', () => {
            expect(getDestination(makeNotification(NotificationType.NEW_SUBSCRIBER))).toBeNull();
        });
    });

    describe('getActionLabelKey', () => {
        it('uses a dedicated CTA for AI summaries', () => {
            expect(getActionLabelKey(NotificationType.VIDEO_AI_SUMMARY_READY)).toBe('notifications.actions.read_summary');
        });

        it('uses watch for navigable video events', () => {
            expect(getActionLabelKey(NotificationType.VIDEO_LIKED)).toBe('notifications.actions.watch');
        });

        it('has no action when there is nothing to open', () => {
            expect(getActionLabelKey(NotificationType.NEW_SUBSCRIBER)).toBeNull();
        });
    });

    describe('getBadgeMeta', () => {
        it('maps each type to an icon and colour variant', () => {
            expect(getBadgeMeta(NotificationType.VIDEO_LIKED).variant).toBe('like');
            expect(getBadgeMeta(NotificationType.NEW_SUBSCRIBER).variant).toBe('subscriber');
            expect(getBadgeMeta(NotificationType.VIDEO_AI_SUMMARY_READY).variant).toBe('ai');
            expect(getBadgeMeta(NotificationType.VIDEO_LIKED).Icon).toBeDefined();
        });
    });

    describe('isAiSummary', () => {
        it('is true only for the AI summary type', () => {
            expect(isAiSummary(NotificationType.VIDEO_AI_SUMMARY_READY)).toBe(true);
            expect(isAiSummary(NotificationType.VIDEO_PROCESSED)).toBe(false);
        });
    });
});
