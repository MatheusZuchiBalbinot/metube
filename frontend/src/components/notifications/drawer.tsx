import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CheckCheck, X, BellOff } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@store';
import { notificationsActions } from '@store/notificationsSlice';
import { selectNotifications } from '@store/notificationsSelectors';
import { notifications as notificationsApi } from '@api';
import type { AppNotification as Notification } from '@api';
import { EmptyState, Tooltip, Skeleton } from '@ui';
import { isWithinDays } from '@utils';
import NotificationItem from './item';
import { getCategory } from './meta';
import './drawer.css';

type Tab = 'all' | 'unread' | 'social' | 'video';

const TABS: Tab[] = ['all', 'unread', 'social', 'video'];

const GROUP_ORDER = ['new', 'today', 'this_week', 'earlier'] as const;

type GroupKey = typeof GROUP_ORDER[number];

const SKELETON_ROWS = [0, 1, 2, 3];

interface NotificationsDrawerProps {
    onClose: () => void
    triggerRef?: React.RefObject<HTMLElement | null>
}

function matchesTab(notification: Notification, tab: Tab): boolean {
    if (tab === 'all') {
        return true;
    }

    if (tab === 'unread') {
        return notification.read_at === null;
    }

    return getCategory(notification.type) === tab;
}

function bucketOf(notification: Notification): GroupKey {
    if (notification.read_at === null) {
        return 'new';
    }

    if (isWithinDays(notification.created_at, 1)) {
        return 'today';
    }

    if (isWithinDays(notification.created_at, 7)) {
        return 'this_week';
    }

    return 'earlier';
}

export default function NotificationsDrawer({ onClose, triggerRef }: NotificationsDrawerProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { items, loading } = useAppSelector(selectNotifications);
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async (): Promise<void> => {
            dispatch(notificationsActions.setLoading(true));
            const result = await notificationsApi.list();

            if (result.ok) {
                dispatch(notificationsActions.setNotifications({
                    items: result.data.data,
                    hasMore: result.data.meta.current_page < result.data.meta.last_page,
                }));
            }

            dispatch(notificationsActions.setLoading(false));
        };

        void load();
    }, [dispatch]);

    useEffect(() => {
        const trigger = triggerRef?.current ?? null;

        function handleKeyDown(e: KeyboardEvent): void {
            if (e.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        panelRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            trigger?.focus();
        };
    }, [onClose, triggerRef]);

    const handleRead = useCallback((id: string): void => {
        dispatch(notificationsActions.markRead(id));
        void notificationsApi.markRead(id);
        onClose();
    }, [dispatch, onClose]);

    const handleDismiss = useCallback((id: string): void => {
        dispatch(notificationsActions.removeNotification(id));
        void notificationsApi.remove(id);
    }, [dispatch]);

    const handleMarkAllRead = useCallback((): void => {
        dispatch(notificationsActions.markAllRead());
        void notificationsApi.markAllRead();
    }, [dispatch]);

    const unreadCount = items.filter(n => n.read_at === null).length;
    const filtered = items.filter(n => matchesTab(n, activeTab));
    const groups = GROUP_ORDER
        .map(key => ({ key, items: filtered.filter(n => bucketOf(n) === key) }))
        .filter(group => group.items.length > 0);

    const isInitialLoading = loading && items.length === 0;
    const isEmpty = !loading && filtered.length === 0;

    function handleOverlayClick(e: React.MouseEvent) {
        const isBackdropClick = e.target === e.currentTarget;

        if (isBackdropClick) {
            onClose();
        }
    }

    return createPortal(
        <div className="notifications-drawer-overlay" role="presentation" onClick={handleOverlayClick}>
            <div
                ref={panelRef}
                className="notifications-drawer"
                role="dialog"
                aria-label={t('notifications.title')}
                tabIndex={-1}
            >
                <header className="notifications-drawer__header">
                    <div className="notifications-drawer__heading">
                        <span className="notifications-drawer__title">{t('notifications.title')}</span>
                        {unreadCount > 0 && (
                            <span className="notifications-drawer__count">{unreadCount}</span>
                        )}
                    </div>
                    <div className="notifications-drawer__header-actions">
                        {unreadCount > 0 && (
                            <Tooltip content={t('notifications.mark_all_read')} side="bottom">
                                <button
                                    className="notifications-drawer__icon-btn"
                                    onClick={handleMarkAllRead}
                                    aria-label={t('notifications.mark_all_read')}
                                >
                                    <CheckCheck size={17} />
                                </button>
                            </Tooltip>
                        )}
                        <button
                            className="notifications-drawer__icon-btn"
                            onClick={onClose}
                            aria-label={t('common.close')}
                        >
                            <X size={17} />
                        </button>
                    </div>
                </header>

                <div className="notifications-drawer__tabs" role="tablist" aria-label={t('notifications.title')}>
                    {TABS.map(tab => {
                        const count = items.filter(n => matchesTab(n, tab)).length;
                        const isActive = activeTab === tab;

                        return (
                            <button
                                key={tab}
                                role="tab"
                                aria-selected={isActive}
                                className={`notifications-drawer__tab${isActive ? ' notifications-drawer__tab--active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {t(`notifications.tabs.${tab}`)}
                                {count > 0 && <span className="notifications-drawer__tab-count">{count}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="notifications-drawer__list">
                    {isInitialLoading && SKELETON_ROWS.map(row => (
                        <div key={row} className="notifications-drawer__skeleton">
                            <Skeleton width={40} height={40} circle />
                            <div className="notifications-drawer__skeleton-body">
                                <Skeleton width="80%" height={12} />
                                <Skeleton width="50%" height={10} />
                            </div>
                        </div>
                    ))}

                    {isEmpty && (
                        <EmptyState
                            icon={<BellOff size={28} />}
                            title={t('notifications.empty')}
                            description={t(`notifications.empty_tab.${activeTab}`)}
                        />
                    )}

                    {groups.map(group => (
                        <section key={group.key} className="notifications-drawer__group">
                            <span className="notifications-drawer__group-label">
                                {t(`notifications.groups.${group.key}`)}
                            </span>
                            {group.items.map(n => (
                                <NotificationItem
                                    key={n.id}
                                    notification={n}
                                    onRead={handleRead}
                                    onDismiss={handleDismiss}
                                />
                            ))}
                        </section>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}
