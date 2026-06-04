import { useState, useRef } from 'react';
import { Bell as BellIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@store';
import { selectNotificationsUnreadCount } from '@store/notificationsSelectors';
import { Tooltip } from '@ui';
import NotificationsPanel from './panel';
import './bell.css';
import { useClickOutside } from '@hooks';

export default function NotificationsBell() {
    const { t } = useTranslation();
    const unreadCount = useAppSelector(selectNotificationsUnreadCount);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    function handleClose(): void {
        setOpen(false);
    }

    useClickOutside(containerRef, handleClose);

    function handleToggle(): void {
        setOpen(prev => !prev);
    }

    const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);
    const hasBadge = unreadCount > 0;

    return (
        <div className="notifications-bell" ref={containerRef}>
            <Tooltip content={t('notifications.bell.label')} side="bottom">
                <button
                    className="notifications-bell__btn"
                    onClick={handleToggle}
                    aria-label={t('notifications.bell.label')}
                    aria-expanded={open}
                    aria-haspopup="dialog"
                >
                    <BellIcon size={18} strokeWidth={1.75} />
                    {hasBadge && (
                        <span className="notifications-bell__badge" aria-label={`${unreadCount} unread`}>
                            {badgeLabel}
                        </span>
                    )}
                </button>
            </Tooltip>

            {open && (
                <div className="notifications-bell__panel">
                    <NotificationsPanel onClose={handleClose} />
                </div>
            )}
        </div>
    );
}
