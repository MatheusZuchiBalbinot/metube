import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store';
import { notificationsActions } from '@store/notificationsSlice';
import { notifications as notificationsApi } from '@api/notifications';
import NotificationItem from './item';
import './panel.css';

interface NotificationsPanelProps {
    onClose: () => void
}

export default function NotificationsPanel({ onClose }: NotificationsPanelProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { items, loading, hasMore } = useAppSelector(s => s.notifications);

    useEffect(() => {
        const load = async (): Promise<void> => {
            dispatch(notificationsActions.setLoading(true));
            const result = await notificationsApi.list();
            if (result) {
                dispatch(notificationsActions.setNotifications({
                    items: result.data,
                    hasMore: result.meta.current_page < result.meta.last_page,
                }));
            }
            dispatch(notificationsActions.setLoading(false));
        };

        void load();
    }, [dispatch]);

    const handleMarkRead = useCallback((id: string): void => {
        dispatch(notificationsActions.markRead(id));
        void notificationsApi.markRead(id);
        onClose();
    }, [dispatch, onClose]);

    const handleMarkAllRead = useCallback((): void => {
        dispatch(notificationsActions.markAllRead());
        void notificationsApi.markAllRead();
    }, [dispatch]);

    const isEmpty = items.length === 0 && !loading;

    return (
        <div className="notifications-panel" role="dialog" aria-label={t('notifications.bell.label')}>
            <div className="notifications-panel__header">
                <span className="notifications-panel__title">{t('notifications.bell.label')}</span>
                <button
                    className="notifications-panel__mark-all"
                    onClick={handleMarkAllRead}
                >
                    {t('notifications.mark_all_read')}
                </button>
            </div>

            <div className="notifications-panel__list">
                {loading && (
                    <div className="notifications-panel__loading" />
                )}

                {isEmpty && (
                    <div className="notifications-panel__empty">
                        {t('notifications.empty')}
                    </div>
                )}

                {items.map(notification => (
                    <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={handleMarkRead}
                    />
                ))}

                {hasMore && (
                    <div className="notifications-panel__footer">
                        <span className="notifications-panel__more">{t('notifications.more')}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
