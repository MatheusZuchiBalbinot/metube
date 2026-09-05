import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, SlidersHorizontal } from '@components/icons/icons';
import type { Tag } from '@models';
import { Button } from '@ui';
import { SortBy, type FilterState, cn } from '@utils';
import './panel.css';
import { useFilterDropdown, type DropdownPos } from './useFilterDropdown';
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
    hideSort?: boolean
    hideTags?: boolean
}

// Sort order isn't counted here — it's not a narrowing criterion like the others,
// and profile's quick-filter chips change it directly without opening this panel.
function countActiveFilters(value: FilterState): number {
    return value.tags.length +
        (value.year !== null ? 1 : 0) +
        (value.dateFrom !== null ? 1 : 0) +
        (value.dateTo !== null ? 1 : 0);
}

interface FilterTriggerButtonProps {
    triggerRef: React.RefObject<HTMLButtonElement | null>
    iconOnly: boolean
    open: boolean
    hasActiveFilters: boolean
    activeCount: number
    onToggle: () => void
}

function FilterTriggerButton({ triggerRef, iconOnly, open, hasActiveFilters, activeCount, onToggle }: FilterTriggerButtonProps) {
    const { t } = useTranslation();

    return (
        <button
            ref={triggerRef}
            type="button"
            className={cn(
                'filter-panel__trigger',
                iconOnly && 'filter-panel__trigger--icon-only',
                open && 'filter-panel__trigger--open',
                hasActiveFilters && 'filter-panel__trigger--active',
            )}
            onClick={onToggle}
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
    );
}

interface FilterDropdownPanelProps {
    open: boolean
    dropdownPos: DropdownPos | null
    dropdownRef: React.RefObject<HTMLDivElement | null>
    allTags: Tag[]
    value: FilterState
    onChange: (f: FilterState) => void
    hasTags: boolean
    hideSort: boolean
    hasActiveFilters: boolean
    onToggleTag: (tag: Tag) => void
    onClearFilters: () => void
}

// Extracted so the open/position guard and the per-section conditionals don't count
// toward FilterPanel's own complexity. Renders via the same document.body portal as before.
function FilterDropdownPanel({
    open, dropdownPos, dropdownRef, allTags, value, onChange,
    hasTags, hideSort, hasActiveFilters, onToggleTag, onClearFilters,
}: FilterDropdownPanelProps) {
    const { t } = useTranslation();
    const shouldRender = open && dropdownPos !== null;

    if (!shouldRender) {
        return null;
    }

    return createPortal((
        <div
            ref={dropdownRef}
            className="filter-panel__dropdown"
            aria-label={t('video.filters')}
            style={{ top: dropdownPos.top, bottom: dropdownPos.bottom, left: dropdownPos.left, maxHeight: dropdownPos.maxHeight }}
        >
            {hasTags && (
                <FilterTags allTags={allTags} value={value} onToggle={onToggleTag} />
            )}

            {!hideSort && <FilterSort value={value} onChange={onChange} />}

            <FilterYear value={value} onChange={onChange} />

            <FilterQuickRange value={value} onChange={onChange} />

            <FilterDateRange value={value} onChange={onChange} />

            {hasActiveFilters && (
                <div className="filter-panel__dropdown-footer">
                    <Button variant="ghost" size="sm" className="filter-panel__dropdown-clear" onClick={onClearFilters}>
                        {t('video.filter_clear')}
                    </Button>
                </div>
            )}
        </div>
    ), document.body);
}

export default function FilterPanel({
    allTags, value, onChange, iconOnly = false, hideSort = false, hideTags = false,
}: FilterPanelProps) {
    const { open, dropdownPos, wrapRef, triggerRef, dropdownRef, toggle } = useFilterDropdown();

    const activeCount = countActiveFilters(value);
    const hasActiveFilters = activeCount > 0;
    const hasTags = allTags.length > 0 && !hideTags;

    function toggleTag(tag: Tag) {
        const isSelected = value.tags.includes(tag);
        const nextTags = isSelected ? value.tags.filter(t => t !== tag) : [...value.tags, tag];
        onChange({ ...value, tags: nextTags });
    }

    function clearFilters() {
        onChange({ tags: [], year: null, dateFrom: null, dateTo: null, sortBy: SortBy.RECENT });
    }

    return (
        <div className="filter-panel" ref={wrapRef}>
            <FilterTriggerButton
                triggerRef={triggerRef}
                iconOnly={iconOnly}
                open={open}
                hasActiveFilters={hasActiveFilters}
                activeCount={activeCount}
                onToggle={toggle}
            />
            <FilterDropdownPanel
                open={open}
                dropdownPos={dropdownPos}
                dropdownRef={dropdownRef}
                allTags={allTags}
                value={value}
                onChange={onChange}
                hasTags={hasTags}
                hideSort={hideSort}
                hasActiveFilters={hasActiveFilters}
                onToggleTag={toggleTag}
                onClearFilters={clearFilters}
            />
        </div>
    );
}
