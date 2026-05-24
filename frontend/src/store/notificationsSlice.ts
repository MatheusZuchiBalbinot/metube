import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppNotification as Notification } from '@api';

interface NotificationsState {
    items: Notification[]
    unreadCount: number
    hasMore: boolean
    loading: boolean
}

const initialState: NotificationsState = {
    items: [],
    unreadCount: 0,
    hasMore: false,
    loading: false,
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        setNotifications(state, action: PayloadAction<{ items: Notification[]; hasMore: boolean }>) {
            state.items = action.payload.items;
            state.hasMore = action.payload.hasMore;
        },
        addNotification(state, action: PayloadAction<Notification>) {
            state.items.unshift(action.payload);
            state.unreadCount += 1;
        },
        setUnreadCount(state, action: PayloadAction<number>) {
            state.unreadCount = action.payload;
        },
        markRead(state, action: PayloadAction<string>) {
            const notification = state.items.find(n => n.id === action.payload);
            if (notification && notification.read_at === null) {
                notification.read_at = new Date().toISOString();
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        markAllRead(state) {
            const now = new Date().toISOString();
            for (const notification of state.items) {
                notification.read_at = notification.read_at ?? now;
            }
            state.unreadCount = 0;
        },
        removeNotification(state, action: PayloadAction<string>) {
            const notification = state.items.find(n => n.id === action.payload);
            const wasUnread = notification?.read_at === null;
            state.items = state.items.filter(n => n.id !== action.payload);
            if (wasUnread) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        reset() {
            return initialState;
        },
    },
});

export const notificationsActions = notificationsSlice.actions;
export default notificationsSlice;
