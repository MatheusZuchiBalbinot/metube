import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Clock, Clapperboard, LayoutGrid, Hash } from 'lucide-react';
import { VideoFilter, type FilterState } from '@utils';
import type { Tag } from '@models';
import { cn } from '@utils';

interface ProfileQuickFiltersProps {
    allTags: Tag[]
    value: FilterState
    onChange: (state: FilterState) => void
    onScrollToTop?: () => void
    onScrollToTrending?: () => void
    onScrollToRecent?: () => void
    onScrollToTopic?: () => void
}

export default function ProfileQuickFilters({
    allTags,
    value,
    onChange,
    onScrollToTop,
    onScrollToTrending,
    onScrollToRecent,
    onScrollToTopic,
}: ProfileQuickFiltersProps) {
    const { t } = useTranslation();

    const hasShorts = allTags.includes('shorts' as Tag);
    const topTags = useMemo(
        () => allTags.filter(tag => tag !== 'shorts').slice(0, 5),
        [allTags],
    );

    const isFilterEmpty = VideoFilter.isEmpty(value);
    const activeTagSet = new Set(value.tags.map(String));

    function handleNavClick(scrollFn?: () => void): void {
        onChange(VideoFilter.emptyState());
        scrollFn?.();
    }

    function handleTagClick(tag: Tag): void {
        const isActive = activeTagSet.has(String(tag));
        onChange(isActive ? VideoFilter.emptyState() : { ...VideoFilter.emptyState(), tags: [tag] });
    }

    return (
        <div className="profile-quick-filters">
            <button
                type="button"
                className={cn('profile-quick-filters__chip', isFilterEmpty && 'profile-quick-filters__chip--active')}
                onClick={() => handleNavClick(onScrollToTop)}
            >
                <LayoutGrid size={13} />
                <span>{t('profile.filter_all')}</span>
            </button>

            <button
                type="button"
                className="profile-quick-filters__chip"
                onClick={() => handleNavClick(onScrollToTrending)}
            >
                <Flame size={13} />
                <span>{t('profile.filter_trending')}</span>
            </button>

            <button
                type="button"
                className="profile-quick-filters__chip"
                onClick={() => handleNavClick(onScrollToRecent)}
            >
                <Clock size={13} />
                <span>{t('profile.filter_recent')}</span>
            </button>

            <button
                type="button"
                className="profile-quick-filters__chip"
                onClick={() => handleNavClick(onScrollToTopic)}
            >
                <Hash size={13} />
                <span>{t('profile.filter_topic')}</span>
            </button>

            {hasShorts && (
                <button
                    type="button"
                    className={cn(
                        'profile-quick-filters__chip',
                        activeTagSet.has('shorts') && 'profile-quick-filters__chip--active',
                    )}
                    onClick={() => handleTagClick('shorts' as Tag)}
                >
                    <Clapperboard size={13} />
                    <span>{t('profile.filter_shorts')}</span>
                </button>
            )}

            {topTags.map(tag => (
                <button
                    key={tag}
                    type="button"
                    className={cn(
                        'profile-quick-filters__chip',
                        activeTagSet.has(String(tag)) && 'profile-quick-filters__chip--active',
                    )}
                    onClick={() => handleTagClick(tag)}
                >
                    <Hash size={12} />
                    <span>#{tag}</span>
                </button>
            ))}
        </div>
    );
}
