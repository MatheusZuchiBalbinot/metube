import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store';
import { notificationsActions } from '@store/notificationsSlice';
import { notifications as notificationsApi } from '@api/notifications';
import type { Notification } from '@api/notifications';
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

    const unread = items.filter((n: Notification) => n.read_at === null);
    const read = items.filter((n: Notification) => n.read_at !== null);
    const isEmpty = items.length === 0 && !loading;

    return (
        <div className="notifications-panel" role="dialog" aria-label={t('notifications.bell.label')}>
            <div className="notifications-panel__header">
                <span className="notifications-panel__title">{t('notifications.bell.label')}</span>
                {unread.length > 0 && (
                    <button
                        className="notifications-panel__mark-all"
                        onClick={handleMarkAllRead}
                    >
                        {t('notifications.mark_all_read')}
                    </button>
                )}
            </div>

            {loading && <div className="notifications-panel__loading" />}

            <div className="notifications-panel__list">
                {isEmpty && (
                    <div className="notifications-panel__empty">
                        {t('notifications.empty')}
                    </div>
                )}

                {unread.length > 0 && (
                    <div className="notifications-panel__group">
                        <span className="notifications-panel__group-label">
                            {t('notifications.unread')}
                        </span>
                        {unread.map(n => (
                            <NotificationItem key={n.id} notification={n} onRead={handleMarkRead} />
                        ))}
                    </div>
                )}

                {read.length > 0 && (
                    <div className="notifications-panel__group">
                        {unread.length > 0 && (
                            <span className="notifications-panel__group-label notifications-panel__group-label--muted">
                                {t('notifications.earlier')}
                            </span>
                        )}
                        {read.map(n => (
                            <NotificationItem key={n.id} notification={n} onRead={handleMarkRead} />
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div className="notifications-panel__footer">
                        <span className="notifications-panel__more">{t('notifications.more')}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
