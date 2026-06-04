import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { Tag } from '@models';
import { Button } from '@ui';
import { SortBy, type FilterState, cn } from '@utils';
import './panel.css';
import { useFilterDropdown } from './useFilterDropdown';
import FilterTags from './filterTags';
import FilterSort from './filterSort';
import FilterYear from './filterYear';
import FilterQuickRange from './filterQuickRange';
import FilterDateRange from './filterDateRange';

export type { FilterState };

interface FilterPanelProps {
    allTags: Tag[]
    value: FilterState
    onChange: (f: FilterState) => void
    iconOnly?: boolean
}

export default function FilterPanel({ allTags, value, onChange, iconOnly = false }: FilterPanelProps) {
    const { t } = useTranslation();
    const { open, dropdownPos, wrapRef, triggerRef, dropdownRef, toggle } = useFilterDropdown();

    const activeCount =
        value.tags.length +
        (value.year !== null ? 1 : 0) +
        (value.dateFrom !== null ? 1 : 0) +
        (value.dateTo !== null ? 1 : 0) +
        (value.sortBy !== SortBy.RECENT ? 1 : 0);

    const hasActiveFilters = activeCount > 0;
    const hasTags = allTags.length > 0;

    function toggleTag(tag: Tag) {
        const isSelected = value.tags.includes(tag);
        const nextTags = isSelected ? value.tags.filter(t => t !== tag) : [...value.tags, tag];
        onChange({ ...value, tags: nextTags });
    }

    function clearFilters() {
        onChange({ tags: [], year: null, dateFrom: null, dateTo: null, sortBy: SortBy.RECENT });
    }

    const dropdown = open && dropdownPos !== null ? (
        <div
            ref={dropdownRef}
            className="filter-panel__dropdown"
            role="dialog"
            aria-label={t('video.filters')}
            style={{ top: dropdownPos.top, bottom: dropdownPos.bottom, left: dropdownPos.left, maxHeight: dropdownPos.maxHeight }}
        >
            {hasTags && (
                <FilterTags allTags={allTags} value={value} onToggle={toggleTag} />
            )}

            <FilterSort value={value} onChange={onChange} />

            <FilterYear value={value} onChange={onChange} />

            <FilterQuickRange value={value} onChange={onChange} />

            <FilterDateRange value={value} onChange={onChange} />

            {hasActiveFilters && (
                <div className="filter-panel__dropdown-footer">
                    <Button variant="ghost" size="sm" className="filter-panel__dropdown-clear" onClick={clearFilters}>
                        {t('video.filter_clear')}
                    </Button>
                </div>
            )}
        </div>
    ) : null;

    return (
        <div className="filter-panel" ref={wrapRef}>
            <button
                ref={triggerRef}
                type="button"
                className={cn(
                    'filter-panel__trigger',
                    iconOnly && 'filter-panel__trigger--icon-only',
                    open && 'filter-panel__trigger--open',
                    hasActiveFilters && 'filter-panel__trigger--active',
                )}
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={t('video.filters')}
            >
                <SlidersHorizontal size={13} strokeWidth={2} />
                {!iconOnly && <span>{t('video.filters')}</span>}
                {hasActiveFilters && (
                    <span className="filter-panel__trigger-badge">{activeCount}</span>
                )}
                {!iconOnly && <ChevronDown size={12} strokeWidth={2.5} className="filter-panel__trigger-chevron" />}
            </button>
            {dropdown !== null && createPortal(dropdown, document.body)}
        </div>
    );
}
