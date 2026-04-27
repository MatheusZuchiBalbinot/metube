import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { SortBy, SORT_OPTIONS, type FilterState } from '@utils/applyFilters';
import { TagColors } from '@utils/tagColors';
import type { Tag } from '@models/tag';
import DatePicker from '@ui/date/picker';
import { Button } from '@ui';
import './panel.css';

export type { FilterState };

interface FilterPanelProps {
    allTags: Tag[]
    value: FilterState
    onChange: (f: FilterState) => void
}

const YEAR_OPTIONS = Array.from(
    { length: new Date().getFullYear() - 2019 },
    (_, i) => new Date().getFullYear() - i,
);

// eslint-disable-next-line complexity
export default function FilterPanel({ allTags, value, onChange }: FilterPanelProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeCount =
        value.tags.length +
        (value.year !== null ? 1 : 0) +
        (value.dateFrom !== null ? 1 : 0) +
        (value.dateTo !== null ? 1 : 0) +
        (value.sortBy !== SortBy.RECENT ? 1 : 0);

    const hasActiveFilters = activeCount > 0;
    const hasTags = allTags.length > 0;

    useLayoutEffect(() => {
        if (!open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDropdownPos(null);
            return;
        }
        const triggerEl = triggerRef.current;
        if (!triggerEl) {
            return;
        }
        const rect = triggerEl.getBoundingClientRect();
        const minMargin = 12;
        setDropdownPos({
            top: rect.bottom + 8,
            right: Math.max(minMargin, window.innerWidth - rect.right),
        });
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleOutside(e: MouseEvent) {
            const target = e.target as Element;
            const isInsideWrap = wrapRef.current?.contains(target);
            const isInsideDropdown = dropdownRef.current?.contains(target);
            const isInsidePortal = !!target.closest?.('[data-radix-popper-content-wrapper]');

            if (!isInsideWrap && !isInsideDropdown && !isInsidePortal) {
                setOpen(false);
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            const isPressedEsc = e.key === 'Escape';
            if (!isPressedEsc) {
                return;
            }
            setOpen(false);
            triggerRef.current?.focus();
        }

        function handleScrollOrResize() {
            setOpen(false);
        }

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleScrollOrResize);
        // capture: true so it fires for any scrollable ancestor
        window.addEventListener('scroll', handleScrollOrResize, true);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [open]);

    function toggleTag(tag: string) {
        const isSelected = value.tags.includes(tag as unknown as Tag);
        const nextTags = isSelected ? value.tags.filter(t => t !== tag) : [...value.tags, tag as unknown as Tag];
        onChange({ ...value, tags: nextTags });
    }

    function clearFilters() {
        onChange({ tags: [], year: null, dateFrom: null, dateTo: null, sortBy: SortBy.RECENT });
    }

    function buildTagChipStyle(tag: string, isActive: boolean): React.CSSProperties | undefined {
        if (!isActive) {
            return undefined;
        }
        const palette = TagColors.palette(tag);
        return {
            background: palette.bg,
            color: palette.color,
            borderColor: `${palette.color}55`,
        };
    }

    function TagChip({ tag }: { tag: string }) {
        const isActive = value.tags.includes(tag as unknown as Tag);
        return (
            <button
                type="button"
                className={`filter-panel__tag-chip${isActive ? ' filter-panel__tag-chip--active' : ''}`}
                style={buildTagChipStyle(tag, isActive)}
                onClick={() => toggleTag(tag)}
                aria-pressed={isActive}
                aria-label={tag}
            >
                {tag}
            </button>
        );
    }

    const dropdown = open && dropdownPos !== null ? (
        <div
            ref={dropdownRef}
            className="filter-panel__dropdown"
            role="dialog"
            aria-label={t('video.filters')}
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
            {hasTags && (
                <div className="filter-panel__dropdown-section">
                    <span className="filter-panel__dropdown-label">{t('video.filter_by_tags')}</span>
                    <div className="filter-panel__dropdown-tags">
                        {allTags.map(tag => <TagChip key={tag} tag={tag} />)}
                    </div>
                </div>
            )}

            <div className="filter-panel__dropdown-section">
                <span className="filter-panel__dropdown-label">{t('video.filter_sort_by')}</span>
                <div className="filter-panel__sort-group">
                    {SORT_OPTIONS.map(opt => {
                        const isActive = value.sortBy === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                className={`filter-panel__sort-btn${isActive ? ' filter-panel__sort-btn--active' : ''}`}
                                onClick={() => onChange({ ...value, sortBy: opt.value })}
                                aria-pressed={isActive}
                            >
                                {t(opt.labelKey)}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="filter-panel__dropdown-section">
                <label className="filter-panel__dropdown-label" htmlFor="fp-year">
                    {t('video.filter_year')}
                </label>
                <select
                    id="fp-year"
                    className="filter-panel__year-select"
                    value={value.year ?? ''}
                    onChange={e => onChange({ ...value, year: e.target.value === '' ? null : Number(e.target.value) })}
                >
                    <option value="">{t('video.filter_all_years')}</option>
                    {YEAR_OPTIONS.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            <div className="filter-panel__dropdown-section">
                <span className="filter-panel__dropdown-label">{t('video.filter_date_range')}</span>
                <div className="filter-panel__date-row">
                    <div className="filter-panel__date-field">
                        <label className="filter-panel__date-label" htmlFor="fp-date-from">
                            {t('video.filter_date_from')}
                        </label>
                        <DatePicker
                            id="fp-date-from"
                            value={value.dateFrom}
                            onChange={v => onChange({ ...value, dateFrom: v })}
                            placeholder={t('video.filter_date_from')}
                        />
                    </div>
                    <div className="filter-panel__date-field">
                        <label className="filter-panel__date-label" htmlFor="fp-date-to">
                            {t('video.filter_date_to')}
                        </label>
                        <DatePicker
                            id="fp-date-to"
                            value={value.dateTo}
                            onChange={v => onChange({ ...value, dateTo: v })}
                            placeholder={t('video.filter_date_to')}
                        />
                    </div>
                </div>
            </div>

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
                className={[
                    'filter-panel__trigger',
                    open ? 'filter-panel__trigger--open' : '',
                    hasActiveFilters ? 'filter-panel__trigger--active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={t('video.filters')}
            >
                <SlidersHorizontal size={13} strokeWidth={2} />
                <span>{t('video.filters')}</span>
                {hasActiveFilters && (
                    <span className="filter-panel__trigger-badge">{activeCount}</span>
                )}
                <ChevronDown size={12} strokeWidth={2.5} className="filter-panel__trigger-chevron" />
            </button>
            {dropdown !== null && createPortal(dropdown, document.body)}
        </div>
    );
}
