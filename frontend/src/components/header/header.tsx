import { useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Square, Plus, Menu, LogOut, Search, Clock, X, User, Tag as TagIcon, LogIn } from 'lucide-react';
import { ROUTES, videoUrl } from '@utils';
import { useSearch } from '@context/search';
import { useAppDispatch, useAppSelector } from '@store';
import { searchActions } from '@store/searchSlice';
import { Avatar, Button, Input, Tooltip } from '@ui';
import PreferencesPanel from '@components/preferences/preferences';
import NotificationsBell from '@components/notifications/bell';
import './header.css';
import { SuggestionKind } from '@enums/suggestionKind';
import { useAuth, useVideo, useClickOutside } from '@hooks';

interface AppHeaderProps {
    onToggleSidebar: () => void
}

const MAX_SUGGESTIONS = 8 as const;



interface Suggestion {
    kind: SuggestionKind
    label: string
    value: string
    targetId: string
}

// eslint-disable-next-line complexity
export default function AppHeader({ onToggleSidebar }: AppHeaderProps) {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const dispatch = useAppDispatch();
    const recentSearches = useAppSelector(s => s.search.recentSearches);
    const videos = useAppSelector(s => s.video.videos);
    const { openUploadModal } = useVideo();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentDropdownOpen, setRecentDropdownOpen] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);

    const { registerSearchInput } = useSearch();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchWrapRef = useRef<HTMLDivElement>(null);

    const trimmedQuery = searchQuery.trim();
    const hasQuery = trimmedQuery.length > 0;
    const isRecentDropdownVisible = recentDropdownOpen && recentSearches.length > 0 && !hasQuery;

    // eslint-disable-next-line complexity
    const suggestions = useMemo<Suggestion[]>(() => {
        if (!hasQuery) {
            return [];
        }

        const needle = trimmedQuery.toLowerCase();
        const seen = new Set<string>();
        const result: Suggestion[] = [];

        function pushUnique(item: Suggestion) {
            const key = `${item.kind}:${item.value.toLowerCase()}`;
            const isAlreadySeen = seen.has(key);
            const isFull = result.length >= MAX_SUGGESTIONS;

            if (isAlreadySeen || isFull) {
                return;
            }

            seen.add(key);
            result.push(item);
        }

        for (const video of videos) {
            const isMatch = video.title.toLowerCase().includes(needle);

            if (isMatch) {
                pushUnique({ kind: SuggestionKind.VIDEO, label: video.title, value: video.title, targetId: video.id });
            }
        }

        for (const video of videos) {
            const isMatch = video.channel.toLowerCase().includes(needle);

            if (isMatch) {
                pushUnique({ kind: SuggestionKind.CHANNEL, label: video.channel, value: video.channel, targetId: video.channelId });
            }
        }

        for (const video of videos) {
            for (const tag of video.tags) {
                const isMatch = tag.toLowerCase().includes(needle);

                if (isMatch) {
                    pushUnique({ kind: SuggestionKind.TAG, label: `#${tag}`, value: tag, targetId: tag });
                }
            }
        }

        return result;
    }, [trimmedQuery, hasQuery, videos]);

    const isSuggestionsDropdownVisible = suggestionsOpen && hasQuery && suggestions.length > 0;

    useClickOutside(dropdownRef, () => setDropdownOpen(false), dropdownOpen);

    useClickOutside(searchWrapRef, () => {
        setRecentDropdownOpen(false);
        setSuggestionsOpen(false);
    }, recentDropdownOpen || suggestionsOpen);

    function handleAvatarClick() {
        setDropdownOpen(v => !v);
    }

    async function handleLogout() {
        await signOut();
        navigate(ROUTES.LOGIN, { replace: true });
    }

    function submitSearch(query: string) {
        const trimmed = query.trim();
        const isEmpty = trimmed.length === 0;

        if (isEmpty) {
            return;
        }

        dispatch(searchActions.addRecentSearch(trimmed));
        setRecentDropdownOpen(false);
        setSuggestionsOpen(false);
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

    function renderSuggestionIcon(kind: SuggestionKind) {
        if (kind === SuggestionKind.VIDEO) {
            return <Play size={13} className="app-header__recent-icon" />;
        }

        if (kind === SuggestionKind.CHANNEL) {
            return <User size={13} className="app-header__recent-icon" />;
        }

        return <TagIcon size={13} className="app-header__recent-icon" />;
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

                {isSuggestionsDropdownVisible && (
                    <div className="app-header__recent-dropdown" role="listbox" aria-label={t('header.suggestions', 'Suggestions')}>
                        <p className="app-header__recent-label">{t('header.suggestions', 'Suggestions')}</p>
                        {suggestions.map(s => (
                            <div
                                key={`${s.kind}:${s.value.toLowerCase()}`}
                                className="app-header__recent-item"
                                role="option"
                                aria-selected={false}
                                onClick={() => handleSuggestionClick(s)}
                            >
                                {renderSuggestionIcon(s.kind)}
                                <span className="app-header__recent-text">{s.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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

                        <div className="app-header__avatar-wrap" ref={dropdownRef}>
                            <Tooltip content={user.name} side="bottom">
                                <Button
                                    variant="ghost"
                                    className={`app-header__avatar-btn${dropdownOpen ? ' open' : ''}`}
                                    onClick={handleAvatarClick}
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
                                        <Button variant="ghost" className="app-header__dropdown-logout" onClick={handleLogout} aria-label={t('common.sign_out')}>
                                            <LogOut size={14} strokeWidth={1.75} />
                                            {t('common.sign_out')}
                                        </Button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
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
