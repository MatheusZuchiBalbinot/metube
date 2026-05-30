import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Clock, Clapperboard, LayoutGrid, Hash } from 'lucide-react';
import { SortBy, VideoFilter, type FilterState } from '@utils';
import type { Tag } from '@models';
import { cn } from '@utils';

interface ProfileQuickFiltersProps {
    allTags: Tag[]
    value: FilterState
    onChange: (state: FilterState) => void
}

type QuickFilterId = 'all' | 'trending' | 'recent' | 'shorts' | string;

interface QuickFilterOption {
    id: QuickFilterId
    labelKey?: string
    label?: string
    icon: React.ReactNode
    state: FilterState
}

function isActive(option: QuickFilterOption, current: FilterState): boolean {
    const s = option.state;
    const tagsMatch = JSON.stringify([...s.tags].sort()) === JSON.stringify([...current.tags].sort());
    const sortMatch = s.sortBy === current.sortBy;
    const noDateFilter = current.year === null && current.dateFrom === null && current.dateTo === null;
    return tagsMatch && sortMatch && noDateFilter;
}

export default function ProfileQuickFilters({ allTags, value, onChange }: ProfileQuickFiltersProps) {
    const { t } = useTranslation();

    const hasShorts = allTags.includes('shorts' as Tag);

    const topTags = useMemo(
        () => allTags.filter(tag => tag !== 'shorts').slice(0, 5),
        [allTags],
    );

    const options = useMemo<QuickFilterOption[]>(() => {
        const base: QuickFilterOption[] = [
            {
                id: 'all',
                labelKey: 'profile.filter_all',
                icon: <LayoutGrid size={13} />,
                state: VideoFilter.emptyState(),
            },
            {
                id: 'trending',
                labelKey: 'profile.filter_trending',
                icon: <Flame size={13} />,
                state: { ...VideoFilter.emptyState(), sortBy: SortBy.VIEWS },
            },
            {
                id: 'recent',
                labelKey: 'profile.filter_recent',
                icon: <Clock size={13} />,
                state: { ...VideoFilter.emptyState(), sortBy: SortBy.RECENT },
            },
        ];

        if (hasShorts) {
            base.push({
                id: 'shorts',
                labelKey: 'profile.filter_shorts',
                icon: <Clapperboard size={13} />,
                state: { ...VideoFilter.emptyState(), tags: ['shorts' as Tag] },
            });
        }

        for (const tag of topTags) {
            base.push({
                id: tag,
                label: `#${tag}`,
                icon: <Hash size={12} />,
                state: { ...VideoFilter.emptyState(), tags: [tag] },
            });
        }

        return base;
    }, [hasShorts, topTags]);

    return (
        <div className="profile-quick-filters">
            {options.map(option => {
                const active = isActive(option, value);
                return (
                    <button
                        key={option.id}
                        type="button"
                        className={cn('profile-quick-filters__chip', active && 'profile-quick-filters__chip--active')}
                        onClick={() => onChange(option.state)}
                    >
                        {option.icon}
                        <span>{option.label ?? t(option.labelKey!)}</span>
                    </button>
                );
            })}
        </div>
    );
}
