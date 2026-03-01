import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Bell, Menu, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@context/useAuth';
import { useTheme } from '@context/useTheme';
import type { ThemeColor, ThemeMode } from '@context/ThemeContext';
import { Avatar, Button, Modal } from '@ui';
import './Header.css';
import '../preferences/Preferences.css';

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

export default function AppHeader() {
    const { t, i18n } = useTranslation();
    const { user, signOut } = useAuth();
    const { mode, color, setMode, setColor } = useTheme();
    const navigate = useNavigate();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
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
        localStorage.setItem('lang', code);
    }

    async function handleLogout() {
        await signOut();
        navigate('/login', { replace: true });
    }

    return (
        <header className="app-header">
            <div className="app-header__left">
                <button
                    className="app-header__icon-btn"
                    aria-label="Menu"
                    style={{ display: 'none' }}
                >
                    <Menu size={18} strokeWidth={1.75} />
                </button>

                <div className="app-header__brand">
                    <div className="app-header__brand-icon">
                        <Play size={15} fill="white" strokeWidth={0} />
                    </div>
                    <span className="app-header__brand-name">{t('common.app_name')}</span>
                </div>
            </div>

            <div className="app-header__right">
                <Button
                    variant="ghost"
                    size="sm"
                    className="app-header__create-btn"
                    leftIcon={<Plus size={14} strokeWidth={2.5} />}
                    onClick={() => setCreateModalOpen(true)}
                >
                    {t('header.create')}
                </Button>

                <button
                    className="app-header__icon-btn"
                    aria-label={t('header.notifications')}
                    style={{ display: 'none' }}
                >
                    <Bell size={17} strokeWidth={1.75} />
                </button>

                <div className="app-header__avatar-wrap" ref={dropdownRef}>
                    <button
                        className={`app-header__avatar-btn${dropdownOpen ? ' open' : ''}`}
                        onClick={() => setDropdownOpen((v) => !v)}
                        aria-label={user?.name}
                        aria-expanded={dropdownOpen}
                    >
                        <Avatar name={user?.name ?? '?'} size="sm" />
                    </button>

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
                                        <button
                                            key={key}
                                            className={`prefs-toggle-btn${mode === key ? ' active' : ''}`}
                                            onClick={() => setMode(key)}
                                        >
                                            {icon}
                                            {t(labelKey)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="prefs-section">
                                <p className="prefs-label">{t('preferences.accent_color')}</p>
                                <div className="prefs-colors">
                                    {COLORS.map(({ key, hex, label }) => (
                                        <button
                                            key={key}
                                            className={`prefs-swatch${color === key ? ' selected' : ''}`}
                                            style={{ background: hex }}
                                            onClick={() => setColor(key)}
                                            aria-label={label}
                                            title={label}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="prefs-section">
                                <p className="prefs-label">{t('preferences.language')}</p>
                                <div className="prefs-toggle">
                                    {LANGUAGES.map(({ code, label, name }) => (
                                        <button
                                            key={code}
                                            className={`prefs-toggle-btn${currentLang === code ? ' active' : ''}`}
                                            onClick={() => changeLanguage(code)}
                                            title={name}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="app-header__dropdown-sep" />

                            <button className="app-header__dropdown-logout" onClick={handleLogout}>
                                <LogOut size={14} strokeWidth={1.75} />
                                {t('common.sign_out')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title={t('header.create')}
            >
                <p className="app-header__modal-placeholder">{t('dashboard.coming_soon')}</p>
            </Modal>
        </header>
    );
}
