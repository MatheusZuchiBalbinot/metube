import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User as UserIcon, ListVideo, Clock, History, ThumbsUp, Settings, Keyboard, HelpCircle } from 'lucide-react';
import { Avatar, Button, Tooltip } from '@ui';
import PreferencesPanel from '@components/preferences/preferences';
import { ROUTES, APP_EVENTS } from '@utils';
import { useClickOutside } from '@hooks';
import type { User } from '@models';

interface Props {
    user: User
    dropdownOpen: boolean
    onAvatarClick: () => void
    onLogout: () => void
    onDropdownClose: () => void
}

const NAV_LINKS = [
    { to: ROUTES.PROFILE, icon: UserIcon, labelKey: 'nav.your_videos' },
    { to: ROUTES.PLAYLISTS, icon: ListVideo, labelKey: 'nav.playlists' },
    { to: ROUTES.WATCH_LATER, icon: Clock, labelKey: 'nav.watch_later' },
    { to: ROUTES.HISTORY, icon: History, labelKey: 'nav.history' },
    { to: ROUTES.LIKED, icon: ThumbsUp, labelKey: 'nav.liked_videos' },
] as const;

export default function HeaderUserMenu({
    user,
    dropdownOpen,
    onAvatarClick,
    onLogout,
    onDropdownClose,
}: Props) {
    const { t } = useTranslation();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useClickOutside(dropdownRef, onDropdownClose, dropdownOpen);

    function handleOpenShortcuts() {
        onDropdownClose();
        window.dispatchEvent(new CustomEvent(APP_EVENTS.OPEN_SHORTCUTS));
    }

    return (
        <div className="app-header__avatar-wrap" ref={dropdownRef}>
            <Tooltip content={user.name} side="bottom">
                <Button
                    variant="ghost"
                    className={`app-header__avatar-btn${dropdownOpen ? ' open' : ''}`}
                    onClick={onAvatarClick}
                    aria-label={user.name}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                >
                    <Avatar name={user.name} src={user.avatar} size="sm" />
                </Button>
            </Tooltip>

            {dropdownOpen && (
                <div className="app-header__dropdown">
                    <Link to={ROUTES.PROFILE} className="app-header__dropdown-user" onClick={onDropdownClose}>
                        <Avatar name={user.name} src={user.avatar} size="md" />
                        <span className="app-header__dropdown-user-text">
                            <span className="app-header__dropdown-name">{user.name}</span>
                            <span className="app-header__dropdown-email">{user.email}</span>
                        </span>
                    </Link>

                    <div className="app-header__dropdown-sep" />

                    <nav className="app-header__dropdown-nav">
                        {NAV_LINKS.map(({ to, icon: Icon, labelKey }) => (
                            <Link key={to} to={to} className="app-header__dropdown-item" onClick={onDropdownClose}>
                                <Icon size={16} strokeWidth={1.75} />
                                {t(labelKey)}
                            </Link>
                        ))}
                    </nav>

                    <div className="app-header__dropdown-sep" />

                    <PreferencesPanel inline />

                    <div className="app-header__dropdown-sep" />

                    <Link to={ROUTES.SETTINGS} className="app-header__dropdown-item" onClick={onDropdownClose}>
                        <Settings size={16} strokeWidth={1.75} />
                        {t('settings.title')}
                    </Link>
                    <button type="button" className="app-header__dropdown-item" onClick={handleOpenShortcuts}>
                        <Keyboard size={16} strokeWidth={1.75} />
                        {t('settings.keyboard_shortcuts')}
                    </button>
                    <Link to={`${ROUTES.SETTINGS}#about`} className="app-header__dropdown-item" onClick={onDropdownClose}>
                        <HelpCircle size={16} strokeWidth={1.75} />
                        {t('settings.help_about')}
                    </Link>

                    <div className="app-header__dropdown-sep" />

                    <button
                        type="button"
                        className="app-header__dropdown-item app-header__dropdown-logout"
                        onClick={onLogout}
                    >
                        <LogOut size={16} strokeWidth={1.75} />
                        {t('common.sign_out')}
                    </button>
                </div>
            )}
        </div>
    );
}
