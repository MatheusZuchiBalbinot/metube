import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Clock, X, User, Tag as TagIcon } from 'lucide-react';
import { Button, Input, Tooltip } from '@ui';
import { useSearch } from '@context/search';
import { useClickOutside } from '@hooks';
import { isActivationKey } from '@utils';
import { SuggestionKind } from '@enums/suggestionKind';
import type { Suggestion } from './types';

interface Props {
    searchQuery: string
    suggestions: Suggestion[]
    recentSearches: string[]
    isRecentDropdownVisible: boolean
    isSuggestionsDropdownVisible: boolean
    onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onFocus: () => void
    onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void
    onSearchIconClick: () => void
    onRecentItemClick: (term: string) => void
    onRemoveRecent: (e: React.MouseEvent, term: string) => void
    onSuggestionClick: (s: Suggestion) => void
    onDropdownClose: () => void
}

function getSuggestionIcon(kind: SuggestionKind) {
    if (kind === SuggestionKind.VIDEO) {
        return <Search size={13} className="app-header__recent-icon" />;
    }

    if (kind === SuggestionKind.CHANNEL) {
        return <User size={13} className="app-header__recent-icon" />;
    }

    return <TagIcon size={13} className="app-header__recent-icon" />;
}

export default function HeaderSearch({
    searchQuery,
    suggestions,
    recentSearches,
    isRecentDropdownVisible,
    isSuggestionsDropdownVisible,
    onQueryChange,
    onFocus,
    onSubmit,
    onSearchIconClick,
    onRecentItemClick,
    onRemoveRecent,
    onSuggestionClick,
    onDropdownClose,
}: Props) {
    const { t } = useTranslation();
    const { registerSearchInput } = useSearch();
    const searchWrapRef = useRef<HTMLDivElement>(null);

    const isAnyDropdownOpen = isRecentDropdownVisible || isSuggestionsDropdownVisible;

    useClickOutside(searchWrapRef, onDropdownClose, isAnyDropdownOpen);

    return (
        <div className="app-header__search" ref={searchWrapRef}>
            <form className="app-header__search-form" onSubmit={onSubmit}>
                <Input
                    ref={registerSearchInput}
                    icon={
                        <Search
                            size={15}
                            style={{ cursor: 'pointer' }}
                            onClick={onSearchIconClick}
                        />
                    }
                    placeholder={t('header.searchPlaceholder', 'Search videos, channels, tags...')}
                    value={searchQuery}
                    onChange={onQueryChange}
                    onFocus={onFocus}
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
                            tabIndex={0}
                            onClick={() => onRecentItemClick(term)}
                            onKeyDown={e => {
                                const isSelf = e.target === e.currentTarget;

                                if (isSelf && isActivationKey(e)) {
                                    e.preventDefault();
                                    onRecentItemClick(term);
                                }
                            }}
                        >
                            <Clock size={13} className="app-header__recent-icon" />
                            <span className="app-header__recent-text">{term}</span>
                            <Tooltip content={t('header.removeRecent', 'Remove')} side="right">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="app-header__recent-remove"
                                    aria-label={t('header.removeRecent', 'Remove')}
                                    onClick={e => onRemoveRecent(e, term)}
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
                            tabIndex={0}
                            onClick={() => onSuggestionClick(s)}
                            onKeyDown={e => {
                                if (isActivationKey(e)) {
                                    e.preventDefault();
                                    onSuggestionClick(s);
                                }
                            }}
                        >
                            {getSuggestionIcon(s.kind)}
                            <span className="app-header__recent-text">{s.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
