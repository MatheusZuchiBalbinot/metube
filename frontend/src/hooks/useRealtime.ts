import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/index';
import { notificationsActions } from '@store/notificationsSlice';
import { toastActions } from '@store/toastSlice';
import { notifications as notificationsApi } from '@api/notifications';
import type { Notification } from '@api/notifications';
import { NotificationType } from '@enums/notificationType';
import getEcho, { destroyEcho } from '@lib/echo';
import { ToastType } from '@enums/toastType';

export function useRealtime(): void {
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.auth.user);

    useEffect(() => {
        if (user === null) {
            return;
        }

        const echo = getEcho();
        const isRealtimeAvailable = echo !== null;

        if (!isRealtimeAvailable) {
            return;
        }

        const fetchInitialCount = async (): Promise<void> => {
            const count = await notificationsApi.unreadCount();
            dispatch(notificationsActions.setUnreadCount(count));
        };

        void fetchInitialCount();

        const channel = echo.private(`users.${user.uuid}`);

        channel.notification((notification: Notification) => {
            dispatch(notificationsActions.addNotification(notification));
            dispatch(toastActions.addToast({
                message: formatNotificationMessage(notification),
                type: ToastType.INFO,
            }));
        });

        return () => {
            echo.leave(`users.${user.uuid}`);
        };
    }, [dispatch, user]);

    useEffect(() => {
        return () => {
            if (user === null) {
                destroyEcho();
            }
        };
    }, [user]);
}

function formatNotificationMessage(notification: Notification): string {
    const data = notification.data;
    switch (notification.type) {
        case NotificationType.COMMENT_REPLIED: return `${String(data.replier_name)} replied to your comment`;
        case NotificationType.COMMENT_LIKED: return `${String(data.liker_name)} liked your comment`;
        case NotificationType.VIDEO_LIKED: return `${String(data.liker_name)} liked your video`;
        case NotificationType.NEW_SUBSCRIBER: return `${String(data.subscriber_name)} subscribed to your channel`;
        case NotificationType.VIDEO_FROM_SUBSCRIPTION: return `New video: ${String(data.title)}`;
    }
}
