import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Bell, Menu, LogOut, Search, Clock, X } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { useVideo } from '@hooks/useVideo';
import { ROUTES } from '@utils/routes';
import { useClickOutside } from '@hooks/useClickOutside';
import { useSearch } from '@context/search';
import { useAppDispatch, useAppSelector } from '@store';
import { searchActions } from '@store/searchSlice';
import { Avatar, Button, Input, Tooltip } from '@ui';
import PreferencesPanel from '@components/preferences/preferences';
import './header.css';

interface AppHeaderProps {
    onToggleSidebar: () => void
}

// eslint-disable-next-line complexity
export default function AppHeader({ onToggleSidebar }: AppHeaderProps) {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const dispatch = useAppDispatch();
    const recentSearches = useAppSelector(s => s.search.recentSearches);
    const { openUploadModal } = useVideo();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentDropdownOpen, setRecentDropdownOpen] = useState(false);

    const { registerSearchInput } = useSearch();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchWrapRef = useRef<HTMLDivElement>(null);

    const isRecentDropdownVisible = recentDropdownOpen && recentSearches.length > 0 && searchQuery.trim() === '';

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

    useClickOutside(searchWrapRef, () => setRecentDropdownOpen(false), recentDropdownOpen);

    function handleBrandClick() {
        navigate(ROUTES.HOME);
    }

    function handleAvatarClick() {
        setDropdownOpen(v => !v);
    }

    async function handleLogout() {
        await signOut();
        navigate(ROUTES.LOGIN, { replace: true });
    }

    function submitSearch(query: string) {
        const trimmed = query.trim();
        const hasQuery = trimmed.length > 0;
        if (!hasQuery) {
            return;
        }
        dispatch(searchActions.addRecentSearch(trimmed));
        setRecentDropdownOpen(false);
        navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(trimmed)}`);
    }

    function handleSearchSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        submitSearch(searchQuery);
    }

    function handleSearchIconClick() {
        submitSearch(searchQuery);
    }

    function handleRecentItemClick(term: string) {
        setSearchQuery(term);
        submitSearch(term);
    }

    function handleRemoveRecent(e: React.MouseEvent, term: string) {
        e.stopPropagation();
        dispatch(searchActions.removeRecentSearch(term));
    }

    function handleSearchFocus() {
        setRecentDropdownOpen(true);
    }

    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSearchQuery(e.target.value);
        const isTyping = e.target.value.length > 0;
        if (isTyping) {
            setRecentDropdownOpen(false);
        }
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

                <div className="app-header__brand" onClick={handleBrandClick} style={{ cursor: 'pointer' }}>
                    <div className="app-header__brand-icon">
                        <Play size={15} fill="white" strokeWidth={0} />
                    </div>
                    <span className="app-header__brand-name">{t('common.app_name')}</span>
                </div>
            </div>

            <div className="app-header__search" ref={searchWrapRef}>
                <form className="app-header__search-form" onSubmit={handleSearchSubmit}>
                    <Input
                        ref={registerSearchInput}
                        icon={
                            <Search
                                size={15}
                                style={{ cursor: 'pointer' }}
                                onClick={handleSearchIconClick}
                            />
                        }
                        placeholder={t('header.searchPlaceholder', 'Search videos, channels, tags...')}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                        className="app-header__search-input"
                    />
                </form>

                {isRecentDropdownVisible && (
                    <div className="app-header__recent-dropdown" role="listbox" aria-label={t('header.recentSearches', 'Recent searches')}>
                        <p className="app-header__recent-label">{t('header.recentSearches', 'Recent searches')}</p>
                        {recentSearches.map(term => (
                            <div
                                key={term}
                                className="app-header__recent-item"
                                role="option"
                                aria-selected={false}
                                onClick={() => handleRecentItemClick(term)}
                            >
                                <Clock size={13} className="app-header__recent-icon" />
                                <span className="app-header__recent-text">{term}</span>
                                <Tooltip content={t('header.removeRecent', 'Remove')} side="right">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="app-header__recent-remove"
                                        aria-label={t('header.removeRecent', 'Remove')}
                                        onClick={e => handleRemoveRecent(e, term)}
                                    >
                                        <X size={12} />
                                    </Button>
                                </Tooltip>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="app-header__right">
                <Tooltip content={t('header.create')} side="bottom">
                    <Button
                        variant="primary"
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
                            onClick={handleAvatarClick}
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

                            <PreferencesPanel inline />

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
