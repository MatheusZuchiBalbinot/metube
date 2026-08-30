// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { notificationsActions } from '@store/notificationsSlice';
import {
    selectNotificationsItems,
    selectNotificationsUnreadCount,
    selectNotificationsHasMore,
    selectNotificationsLoading,
    selectNotifications,
} from '@store/notificationsSelectors';
import type { Notification } from '@api';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
    return {
        id: 'n-1',
        type: 'comment',
        message: 'New comment',
        readAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        ...overrides,
    } as Notification;
}

describe('notificationsSelectors', () => {
    it('starts with empty items, zero unread, no more pages, not loading', () => {
        const store = makeStore();

        expect(selectNotificationsItems(store.getState())).toEqual([]);
        expect(selectNotificationsUnreadCount(store.getState())).toBe(0);
        expect(selectNotificationsHasMore(store.getState())).toBe(false);
        expect(selectNotificationsLoading(store.getState())).toBe(false);
    });

    it('reflects notifications after setNotifications and setUnreadCount', () => {
        const store = makeStore();
        const item = makeNotification();

        store.dispatch(notificationsActions.setNotifications({ items: [item], hasMore: true }));
        store.dispatch(notificationsActions.setUnreadCount(3));

        expect(selectNotificationsItems(store.getState())).toEqual([item]);
        expect(selectNotificationsHasMore(store.getState())).toBe(true);
        expect(selectNotificationsUnreadCount(store.getState())).toBe(3);
    });

    it('selectNotifications returns the whole slice', () => {
        const store = makeStore();
        expect(selectNotifications(store.getState())).toBe(store.getState().notifications);
    });
});
