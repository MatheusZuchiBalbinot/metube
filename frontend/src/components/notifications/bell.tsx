import { useState, useRef, useCallback } from 'react';
import { BellIcon } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@store';
import { selectNotificationsUnreadCount } from '@store/notificationsSelectors';
import { Tooltip } from '@ui';
import NotificationsDrawer from './drawer';
import './bell.css';

export default function NotificationsBell() {
    const { t } = useTranslation();
    const unreadCount = useAppSelector(selectNotificationsUnreadCount);
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);

    const handleClose = useCallback((): void => {
        setOpen(false);
    }, []);

    function handleToggle(): void {
        setOpen(prev => !prev);
    }

    const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);
    const hasBadge = unreadCount > 0;
    const bellLabel = hasBadge
        ? t('notifications.bell.label_with_count', { count: unreadCount })
        : t('notifications.bell.label');

    return (
        <div className="notifications-bell">
            <Tooltip content={t('notifications.bell.label')} side="bottom">
                <button
                    ref={btnRef}
                    className="notifications-bell__btn"
                    onClick={handleToggle}
                    aria-label={bellLabel}
                    aria-expanded={open}
                    aria-haspopup="dialog"
                >
                    <BellIcon size={18} strokeWidth={1.75} />
                    {hasBadge && (
                        <span className="notifications-bell__badge" aria-hidden="true">
                            {badgeLabel}
                        </span>
                    )}
                </button>
            </Tooltip>

            {open && <NotificationsDrawer onClose={handleClose} triggerRef={btnRef} />}
        </div>
    );
}
