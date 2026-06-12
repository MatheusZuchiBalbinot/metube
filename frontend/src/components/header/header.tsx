import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Square, Plus, Menu, LogIn } from 'lucide-react';
import { ROUTES, videoUrl } from '@utils';
import { useAppDispatch, useAppSelector } from '@store';
import { searchActions } from '@store/searchSlice';
import { selectRecentSearches } from '@store/searchSelectors';
import { selectAllVideos } from '@store/videoSelectors';
import { Button, Tooltip } from '@ui';
import NotificationsBell from '@components/notifications/bell';
import './header.css';
import { useAuth, useVideo } from '@hooks';
import { SuggestionKind } from '@enums/suggestionKind';
import HeaderSearch from './headerSearch';
import HeaderUserMenu from './headerUserMenu';
import { buildSuggestions } from './headerSuggestions';
import type { Suggestion } from './types';

interface AppHeaderProps {
    onToggleSidebar: () => void
}

export default function AppHeader({ onToggleSidebar }: AppHeaderProps) {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const dispatch = useAppDispatch();
    const recentSearches = useAppSelector(selectRecentSearches);
    const videos = useAppSelector(selectAllVideos);
    const { openUploadModal } = useVideo();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentDropdownOpen, setRecentDropdownOpen] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);

    const trimmedQuery = searchQuery.trim();
    const hasQuery = trimmedQuery.length > 0;
    const isRecentDropdownVisible = recentDropdownOpen && recentSearches.length > 0 && !hasQuery;

    const suggestions = useMemo<Suggestion[]>(
        () => (hasQuery ? buildSuggestions(trimmedQuery, videos) : []),
        [trimmedQuery, hasQuery, videos],
    );

    const isSuggestionsDropdownVisible = suggestionsOpen && hasQuery && suggestions.length > 0;

    function closeSearchDropdowns() {
        setRecentDropdownOpen(false);
        setSuggestionsOpen(false);
    }

    function submitSearch(query: string) {
        const trimmed = query.trim();
        const isEmpty = trimmed.length === 0;

        if (isEmpty) {
            return;
        }

        dispatch(searchActions.addRecentSearch(trimmed));
        closeSearchDropdowns();
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
        const shouldShowSuggestions = hasQuery && suggestions.length > 0;

        if (shouldShowSuggestions) {
            setSuggestionsOpen(true);
            return;
        }

        setRecentDropdownOpen(true);
    }

    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setSearchQuery(value);
        const isTyping = value.trim().length > 0;

        if (isTyping) {
            setRecentDropdownOpen(false);
            setSuggestionsOpen(true);
            return;
        }

        setSuggestionsOpen(false);
        setRecentDropdownOpen(true);
    }

    function handleSuggestionClick(s: Suggestion) {
        setSuggestionsOpen(false);

        if (s.kind === SuggestionKind.VIDEO) {
            navigate(videoUrl(s.targetId));
            return;
        }

        if (s.kind === SuggestionKind.CHANNEL) {
            navigate(ROUTES.USER.replace(':id', s.targetId));
            return;
        }

        submitSearch(s.value);
    }

    async function handleLogout() {
        await signOut();
        navigate(ROUTES.LOGIN, { replace: true });
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

                <Link to={ROUTES.HOME} className="app-header__brand">
                    <div className="app-header__brand-icon">
                        <Square size={15} fill="white" strokeWidth={0} />
                    </div>
                    <span className="app-header__brand-name">{t('common.app_name')}</span>
                </Link>
            </div>

            <HeaderSearch
                searchQuery={searchQuery}
                suggestions={suggestions}
                recentSearches={recentSearches}
                isRecentDropdownVisible={isRecentDropdownVisible}
                isSuggestionsDropdownVisible={isSuggestionsDropdownVisible}
                onQueryChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onSubmit={handleSearchSubmit}
                onSearchIconClick={handleSearchIconClick}
                onRecentItemClick={handleRecentItemClick}
                onRemoveRecent={handleRemoveRecent}
                onSuggestionClick={handleSuggestionClick}
                onDropdownClose={closeSearchDropdowns}
            />

            <div className="app-header__right">
                {user ? (
                    <>
                        <NotificationsBell />

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

                        <HeaderUserMenu
                            user={user}
                            dropdownOpen={dropdownOpen}
                            onAvatarClick={() => setDropdownOpen(v => !v)}
                            onLogout={handleLogout}
                            onDropdownClose={() => setDropdownOpen(false)}
                        />
                    </>
                ) : (
                    <Link to={ROUTES.LOGIN} className="app-header__sign-in-btn">
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<LogIn size={14} strokeWidth={2} />}
                        >
                            {t('auth.sign_in')}
                        </Button>
                    </Link>
                )}
            </div>
        </header>
    );
}
