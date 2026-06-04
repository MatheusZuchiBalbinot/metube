import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { Avatar, Button, Tooltip } from '@ui';
import PreferencesPanel from '@components/preferences/preferences';
import { useClickOutside } from '@hooks';
import type { User } from '@models';

interface Props {
    user: User
    dropdownOpen: boolean
    onAvatarClick: () => void
    onLogout: () => void
    onDropdownClose: () => void
}

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
                    <Avatar name={user.name} size="sm" />
                </Button>
            </Tooltip>

            {dropdownOpen && (
                <div className="app-header__dropdown">
                    <div className="app-header__dropdown-user">
                        <span className="app-header__dropdown-name">{user.name}</span>
                        <span className="app-header__dropdown-email">{user.email}</span>
                    </div>

                    <div className="app-header__dropdown-sep" />

                    <PreferencesPanel inline />

                    <div className="app-header__dropdown-sep" />

                    <Tooltip content={t('common.sign_out')} side="left">
                        <Button
                            variant="ghost"
                            className="app-header__dropdown-logout"
                            onClick={onLogout}
                            aria-label={t('common.sign_out')}
                        >
                            <LogOut size={14} strokeWidth={1.75} />
                            {t('common.sign_out')}
                        </Button>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}
