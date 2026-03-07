import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Bell, Menu, LogOut, Moon, Sun, Search } from 'lucide-react';
import { useAuth } from '@context/useAuth';
import { useTheme } from '@context/useTheme';
import { useVideo } from '@context/useVideo';
import type { ThemeColor, ThemeMode } from '@utils/themes';
import { STORAGE_KEYS } from '@utils/storageKeys';
import { ROUTES } from '@utils/routes';
import { Avatar, Button, Input, Tooltip } from '@ui';
import './header.css';
import '../preferences/preferences.css';

const COLORS: { key: ThemeColor; hex: string; label: string }[] = [
    { key: 'violet', hex: '#7c3aed', label: 'Violet' },
    { key: 'blue', hex: '#2563eb', label: 'Blue' },
    { key: 'green', hex: '#059669', label: 'Green' },
    { key: 'rose', hex: '#e11d48', label: 'Rose' },
    { key: 'amber', hex: '#d97706', label: 'Amber' },
];

const MODES: { key: ThemeMode; icon: React.ReactNode; labelKey: string }[] = [
    { key: 'dark', icon: <Moon size={13} />, labelKey: 'preferences.dark' },
    { key: 'light', icon: <Sun size={13} />, labelKey: 'preferences.light' },
];

const LANGUAGES = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'pt', label: 'PT', name: 'Português' },
];

interface AppHeaderProps {
    onToggleSidebar: () => void;
}

export default function AppHeader({ onToggleSidebar }: AppHeaderProps) {
    const { t, i18n } = useTranslation();
    const { user, signOut } = useAuth();
    const { mode, color, setMode, setColor } = useTheme();
    const navigate = useNavigate();

    const { openUploadModal } = useVideo();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLang = i18n.language.split('-')[0];

    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            const isOutside = dropdownRef.current && !dropdownRef.current.contains(e.target as Node);

            if (isOutside) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    function changeLanguage(code: string) {
        i18n.changeLanguage(code);
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, code);
    }

    async function handleLogout() {
        await signOut();
        navigate(ROUTES.LOGIN, { replace: true });
    }

    function handleSearchSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        const hasQuery = trimmed.length > 0;
        if (!hasQuery) { return; }
        navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(trimmed)}`);
    }

    return (
        <header className="app-header">
            <div className="app-header__left">
                <Tooltip content={t('nav.toggle_sidebar')} side="bottom">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="app-header__icon-btn app-header__menu-btn"
                        aria-label={t('nav.toggle_sidebar')}
                        onClick={onToggleSidebar}
                    >
                        <Menu size={18} strokeWidth={1.75} />
                    </Button>
                </Tooltip>

                <div className="app-header__brand" onClick={() => navigate(ROUTES.HOME)} style={{ cursor: 'pointer' }}>
                    <div className="app-header__brand-icon">
                        <Play size={15} fill="white" strokeWidth={0} />
                    </div>
                    <span className="app-header__brand-name">{t('common.app_name')}</span>
                </div>
            </div>

            <div className="app-header__search">
                <form className="app-header__search-form" onSubmit={handleSearchSubmit}>
                    <Input
                        icon={<Search size={15} />}
                        placeholder={t('video.search_placeholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="app-header__search-input"
                    />
                </form>
            </div>

            <div className="app-header__right">
                <Tooltip content={t('header.create')} side="bottom">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="app-header__create-btn"
                        leftIcon={<Plus size={14} strokeWidth={2.5} />}
                        onClick={openUploadModal}
                        aria-label={t('header.create')}
                    >
                        {t('header.create')}
                    </Button>
                </Tooltip>

                <Button
                    size="icon"
                    variant="ghost"
                    className="app-header__icon-btn"
                    aria-label={t('header.notifications')}
                    style={{ display: 'none' }}
                >
                    <Bell size={17} strokeWidth={1.75} />
                </Button>

                <div className="app-header__avatar-wrap" ref={dropdownRef}>
                    <Tooltip content={user?.name ?? ''} side="bottom">
                        <Button
                            variant="ghost"
                            className={`app-header__avatar-btn${dropdownOpen ? ' open' : ''}`}
                            onClick={() => setDropdownOpen((v) => !v)}
                            aria-label={user?.name}
                            aria-expanded={dropdownOpen}
                            aria-haspopup="true"
                        >
                            <Avatar name={user?.name ?? '?'} size="sm" />
                        </Button>
                    </Tooltip>

                    {dropdownOpen && (
                        <div className="app-header__dropdown">
                            <div className="app-header__dropdown-user">
                                <span className="app-header__dropdown-name">{user?.name}</span>
                                <span className="app-header__dropdown-email">{user?.email}</span>
                            </div>

                            <div className="app-header__dropdown-sep" />

                            <div className="prefs-section">
                                <p className="prefs-label">{t('preferences.theme')}</p>
                                <div className="prefs-toggle">
                                    {MODES.map(({ key, icon, labelKey }) => (
                                        <Button
                                            key={key}
                                            variant="ghost"
                                            className={`prefs-toggle-btn${mode === key ? ' active' : ''}`}
                                            onClick={() => setMode(key)}
                                            aria-label={t(labelKey)}
                                            aria-pressed={mode === key}
                                        >
                                            {icon}
                                            {t(labelKey)}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="prefs-section">
                                <p className="prefs-label">{t('preferences.accent_color')}</p>
                                <div className="prefs-colors">
                                    {COLORS.map(({ key, hex, label }) => (
                                        <Tooltip key={key} content={label} side="bottom">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className={`prefs-swatch${color === key ? ' selected' : ''}`}
                                                style={{ background: hex }}
                                                onClick={() => setColor(key)}
                                                aria-label={label}
                                                aria-pressed={color === key}
                                            />
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>

                            <div className="prefs-section">
                                <p className="prefs-label">{t('preferences.language')}</p>
                                <div className="prefs-toggle">
                                    {LANGUAGES.map(({ code, label, name }) => (
                                        <Button
                                            key={code}
                                            variant="ghost"
                                            className={`prefs-toggle-btn${currentLang === code ? ' active' : ''}`}
                                            onClick={() => changeLanguage(code)}
                                            aria-label={name}
                                            aria-pressed={currentLang === code}
                                            title={name}
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="app-header__dropdown-sep" />

                            <Tooltip content={t('common.sign_out')} side="left">
                                <Button variant="ghost" className="app-header__dropdown-logout" onClick={handleLogout} aria-label={t('common.sign_out')}>
                                    <LogOut size={14} strokeWidth={1.75} />
                                    {t('common.sign_out')}
                                </Button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>

        </header>
    );
}
