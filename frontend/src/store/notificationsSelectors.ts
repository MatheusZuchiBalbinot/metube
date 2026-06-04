import type { RootState } from './types';

export const selectNotificationsItems = (state: RootState) => state.notifications.items;
export const selectNotificationsUnreadCount = (state: RootState) => state.notifications.unreadCount;
export const selectNotificationsHasMore = (state: RootState) => state.notifications.hasMore;
export const selectNotificationsLoading = (state: RootState) => state.notifications.loading;
export const selectNotifications = (state: RootState) => state.notifications;
