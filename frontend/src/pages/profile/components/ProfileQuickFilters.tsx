import { useTranslation } from 'react-i18next';
import { Hash } from '@components/icons/icons';
import { SortBy, SORT_OPTIONS, type FilterState } from '@utils';
import { cn } from '@utils';

interface ProfileQuickFiltersProps {
    value: FilterState
    onChange: (state: FilterState) => void
    isTopicViewActive?: boolean
    onScrollToTrending?: () => void
    onScrollToRecent?: () => void
    onToggleTopicView?: () => void
}

// View controls — sort order and the "by topic" switch — change how the list is
// displayed. Narrowing it (tags, year, date range) lives in the shared FilterPanel.
export default function ProfileQuickFilters({
    value,
    onChange,
    isTopicViewActive = false,
    onScrollToTrending,
    onScrollToRecent,
    onToggleTopicView,
}: ProfileQuickFiltersProps) {
    const { t } = useTranslation();

    // Sort and tag filters are orthogonal — picking a sort option only touches
    // FilterState.sortBy, so an active tag filter stays applied.
    function handleSortChange(sortBy: SortBy): void {
        onChange({ ...value, sortBy });

        if (sortBy === SortBy.VIEWS) {
            onScrollToTrending?.();
        } else if (sortBy === SortBy.RECENT) {
            onScrollToRecent?.();
        }
    }

    return (
        <div className="profile-quick-filters">
            <span className="profile-quick-filters__sort-label">{t('video.filter_sort_by')}</span>
            <div className="profile-quick-filters__sort" role="group" aria-label={t('video.filter_sort_by')}>
                {SORT_OPTIONS.map(opt => {
                    const isActive = !isTopicViewActive && value.sortBy === opt.value;

                    return (
                        <button
                            key={opt.value}
                            type="button"
                            className={cn('profile-quick-filters__sort-btn', isActive && 'profile-quick-filters__sort-btn--active')}
                            aria-pressed={isActive}
                            disabled={isTopicViewActive}
                            onClick={() => handleSortChange(opt.value)}
                        >
                            {t(opt.labelKey)}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                className={cn('profile-quick-filters__topic-toggle', isTopicViewActive && 'profile-quick-filters__topic-toggle--active')}
                aria-pressed={isTopicViewActive}
                onClick={onToggleTopicView}
            >
                <Hash size={13} />
                {t('profile.filter_topic')}
            </button>
        </div>
    );
}
