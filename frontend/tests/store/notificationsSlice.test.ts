// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import notificationsSlice, { notificationsActions } from '@store/notificationsSlice';
import type { Notification } from '@api/notifications';
import { NotificationType } from '@enums/notificationType';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reducer = notificationsSlice.reducer;

function makeNotification(overrides: Partial<Notification> = {}): Notification {
    return {
        id: 'notif-1',
        type: NotificationType.VIDEO_LIKED,
        data: {},
        read_at: null,
        created_at: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

function makeState(overrides: Partial<{
    items: Notification[];
    unreadCount: number;
    hasMore: boolean;
    loading: boolean;
}> = {}) {
    return {
        items: [],
        unreadCount: 0,
        hasMore: false,
        loading: false,
        ...overrides,
    };
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe('notificationsSlice — initial state', () => {
    it('has empty items array', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.items).toEqual([]);
    });

    it('has unreadCount of 0', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.unreadCount).toBe(0);
    });

    it('has hasMore as false', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.hasMore).toBe(false);
    });

    it('has loading as false', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.loading).toBe(false);
    });
});

// ─── setLoading ───────────────────────────────────────────────────────────────

describe('notificationsSlice — setLoading', () => {
    it('sets loading to true', () => {
        const state = makeState({ loading: false });
        const next = reducer(state, notificationsActions.setLoading(true));
        expect(next.loading).toBe(true);
    });

    it('sets loading to false', () => {
        const state = makeState({ loading: true });
        const next = reducer(state, notificationsActions.setLoading(false));
        expect(next.loading).toBe(false);
    });
});

// ─── setNotifications ─────────────────────────────────────────────────────────

describe('notificationsSlice — setNotifications', () => {
    it('replaces items with the provided list', () => {
        const existing = makeNotification({ id: 'old' });
        const state = makeState({ items: [existing] });
        const newItems = [makeNotification({ id: 'new-1' }), makeNotification({ id: 'new-2' })];
        const next = reducer(state, notificationsActions.setNotifications({ items: newItems, hasMore: true }));
        expect(next.items).toEqual(newItems);
    });

    it('sets hasMore flag', () => {
        const state = makeState({ hasMore: false });
        const next = reducer(state, notificationsActions.setNotifications({ items: [], hasMore: true }));
        expect(next.hasMore).toBe(true);
    });

    it('sets hasMore to false when no more pages', () => {
        const state = makeState({ hasMore: true });
        const next = reducer(state, notificationsActions.setNotifications({ items: [], hasMore: false }));
        expect(next.hasMore).toBe(false);
    });

    it('does not modify unreadCount', () => {
        const state = makeState({ unreadCount: 5 });
        const next = reducer(state, notificationsActions.setNotifications({ items: [], hasMore: false }));
        expect(next.unreadCount).toBe(5);
    });
});

// ─── addNotification ──────────────────────────────────────────────────────────

describe('notificationsSlice — addNotification', () => {
    it('prepends the notification to items', () => {
        const existing = makeNotification({ id: 'old' });
        const state = makeState({ items: [existing] });
        const incoming = makeNotification({ id: 'new' });
        const next = reducer(state, notificationsActions.addNotification(incoming));
        expect(next.items[0].id).toBe('new');
        expect(next.items[1].id).toBe('old');
    });

    it('increments unreadCount by 1', () => {
        const state = makeState({ unreadCount: 3 });
        const next = reducer(state, notificationsActions.addNotification(makeNotification()));
        expect(next.unreadCount).toBe(4);
    });

    it('increments unreadCount from 0 to 1 on first notification', () => {
        const state = makeState({ unreadCount: 0 });
        const next = reducer(state, notificationsActions.addNotification(makeNotification()));
        expect(next.unreadCount).toBe(1);
    });
});

// ─── setUnreadCount ───────────────────────────────────────────────────────────

describe('notificationsSlice — setUnreadCount', () => {
    it('sets unreadCount to the provided value', () => {
        const state = makeState({ unreadCount: 0 });
        const next = reducer(state, notificationsActions.setUnreadCount(7));
        expect(next.unreadCount).toBe(7);
    });

    it('sets unreadCount to 0', () => {
        const state = makeState({ unreadCount: 10 });
        const next = reducer(state, notificationsActions.setUnreadCount(0));
        expect(next.unreadCount).toBe(0);
    });
});

// ─── markRead ─────────────────────────────────────────────────────────────────

describe('notificationsSlice — markRead', () => {
    it('sets read_at on the matched notification', () => {
        const notif = makeNotification({ id: 'n1', read_at: null });
        const state = makeState({ items: [notif], unreadCount: 1 });
        const next = reducer(state, notificationsActions.markRead('n1'));
        expect(next.items[0].read_at).not.toBeNull();
    });

    it('decrements unreadCount by 1 when notification was unread', () => {
        const notif = makeNotification({ id: 'n1', read_at: null });
        const state = makeState({ items: [notif], unreadCount: 3 });
        const next = reducer(state, notificationsActions.markRead('n1'));
        expect(next.unreadCount).toBe(2);
    });

    it('does not decrement unreadCount when notification was already read', () => {
        const notif = makeNotification({ id: 'n1', read_at: '2024-01-01T00:00:00Z' });
        const state = makeState({ items: [notif], unreadCount: 2 });
        const next = reducer(state, notificationsActions.markRead('n1'));
        expect(next.unreadCount).toBe(2);
    });

    it('does nothing when notification id does not match', () => {
        const notif = makeNotification({ id: 'n1', read_at: null });
        const state = makeState({ items: [notif], unreadCount: 1 });
        const next = reducer(state, notificationsActions.markRead('nonexistent'));
        expect(next.items[0].read_at).toBeNull();
        expect(next.unreadCount).toBe(1);
    });

    it('does not allow unreadCount to go below 0', () => {
        const notif = makeNotification({ id: 'n1', read_at: null });
        const state = makeState({ items: [notif], unreadCount: 0 });
        const next = reducer(state, notificationsActions.markRead('n1'));
        expect(next.unreadCount).toBe(0);
    });
});

// ─── markAllRead ──────────────────────────────────────────────────────────────

describe('notificationsSlice — markAllRead', () => {
    it('sets read_at on all unread notifications', () => {
        const items = [
            makeNotification({ id: 'n1', read_at: null }),
            makeNotification({ id: 'n2', read_at: null }),
        ];
        const state = makeState({ items, unreadCount: 2 });
        const next = reducer(state, notificationsActions.markAllRead());

        for (const item of next.items) {
            expect(item.read_at).not.toBeNull();
        }
    });

    it('does not overwrite read_at on already-read notifications', () => {
        const alreadyRead = makeNotification({ id: 'n1', read_at: '2024-01-01T00:00:00Z' });
        const state = makeState({ items: [alreadyRead], unreadCount: 0 });
        const next = reducer(state, notificationsActions.markAllRead());
        expect(next.items[0].read_at).toBe('2024-01-01T00:00:00Z');
    });

    it('sets unreadCount to 0', () => {
        const items = [
            makeNotification({ id: 'n1', read_at: null }),
            makeNotification({ id: 'n2', read_at: null }),
        ];
        const state = makeState({ items, unreadCount: 2 });
        const next = reducer(state, notificationsActions.markAllRead());
        expect(next.unreadCount).toBe(0);
    });

    it('is a no-op on empty items', () => {
        const state = makeState({ items: [], unreadCount: 0 });
        const next = reducer(state, notificationsActions.markAllRead());
        expect(next.items).toEqual([]);
        expect(next.unreadCount).toBe(0);
    });
});

// ─── removeNotification ───────────────────────────────────────────────────────

describe('notificationsSlice — removeNotification', () => {
    it('removes the notification with the given id', () => {
        const items = [
            makeNotification({ id: 'n1' }),
            makeNotification({ id: 'n2' }),
        ];
        const state = makeState({ items });
        const next = reducer(state, notificationsActions.removeNotification('n1'));
        expect(next.items.find(n => n.id === 'n1')).toBeUndefined();
        expect(next.items.find(n => n.id === 'n2')).toBeDefined();
    });

    it('decrements unreadCount when removed notification was unread', () => {
        const notif = makeNotification({ id: 'n1', read_at: null });
        const state = makeState({ items: [notif], unreadCount: 2 });
        const next = reducer(state, notificationsActions.removeNotification('n1'));
        expect(next.unreadCount).toBe(1);
    });

    it('does not decrement unreadCount when removed notification was already read', () => {
        const notif = makeNotification({ id: 'n1', read_at: '2024-01-01T00:00:00Z' });
        const state = makeState({ items: [notif], unreadCount: 2 });
        const next = reducer(state, notificationsActions.removeNotification('n1'));
        expect(next.unreadCount).toBe(2);
    });

    it('does not allow unreadCount to go below 0', () => {
        const notif = makeNotification({ id: 'n1', read_at: null });
        const state = makeState({ items: [notif], unreadCount: 0 });
        const next = reducer(state, notificationsActions.removeNotification('n1'));
        expect(next.unreadCount).toBe(0);
    });

    it('is a no-op when id does not match any item', () => {
        const notif = makeNotification({ id: 'n1' });
        const state = makeState({ items: [notif], unreadCount: 1 });
        const next = reducer(state, notificationsActions.removeNotification('nonexistent'));
        expect(next.items).toHaveLength(1);
        expect(next.unreadCount).toBe(1);
    });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('notificationsSlice — reset', () => {
    it('restores all fields to initial values', () => {
        const items = [makeNotification({ id: 'n1' })];
        const state = makeState({ items, unreadCount: 5, hasMore: true, loading: true });
        const next = reducer(state, notificationsActions.reset());
        expect(next.items).toEqual([]);
        expect(next.unreadCount).toBe(0);
        expect(next.hasMore).toBe(false);
        expect(next.loading).toBe(false);
    });
});
