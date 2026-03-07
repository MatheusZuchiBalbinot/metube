import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, X } from 'lucide-react';
import { SortBy, type FilterState } from '@utils/applyFilters';
import { TagColors } from '@utils/tagColors';
import DatePicker from '@ui/date/picker';
import { Button, Tooltip } from '@ui';
import './panel.css';

export type { FilterState };

interface FilterPanelProps {
    allTags: string[]
    value: FilterState
    onChange: (f: FilterState) => void
}

const SORT_OPTIONS: { value: FilterState['sortBy']; labelKey: string }[] = [
    { value: SortBy.RECENT, labelKey: 'video.sort_recent' },
    { value: SortBy.VIEWS, labelKey: 'video.sort_views' },
    { value: SortBy.AZ, labelKey: 'video.sort_az' },
];

const YEAR_OPTIONS = Array.from(
    { length: new Date().getFullYear() - 2019 },
    (_, i) => new Date().getFullYear() - i,
);

const VISIBLE_TAG_COUNT = 8;

export default function FilterPanel({ allTags, value, onChange }: FilterPanelProps) {
    const { t } = useTranslation();
    const [showMore, setShowMore] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    const hasActiveFilters =
        value.tags.length > 0 ||
        value.year !== null ||
        value.dateFrom !== null ||
        value.dateTo !== null ||
        value.sortBy !== SortBy.RECENT;

    const hasAdvancedActiveFilters =
        value.year !== null ||
        value.dateFrom !== null ||
        value.dateTo !== null;

    const visibleTags = allTags.slice(0, VISIBLE_TAG_COUNT);
    const hiddenTags = allTags.slice(VISIBLE_TAG_COUNT);
    const hasHiddenTags = hiddenTags.length > 0;

    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            const target = e.target as Element;
            const isInsideMore = moreRef.current?.contains(target);
            const isInsidePortal = !!target.closest?.('[data-radix-popper-content-wrapper]');

            if (!isInsideMore && !isInsidePortal) {
                setShowMore(false);
            }
        }

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    function toggleTag(tag: string) {
        const isSelected = value.tags.includes(tag);
        const nextTags = isSelected ? value.tags.filter(t => t !== tag) : [...value.tags, tag];

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
            borderColor: `${palette.color}55`
        };
    }

    return (
        <div className="filter-panel">
            {/* Visible tag chips */}
            {visibleTags.map(tag => {
                const isActive = value.tags.includes(tag);
                return (
                    <Button
                        key={tag}
                        variant="ghost"
                        className={`filter-panel__tag-chip${isActive ? ' filter-panel__tag-chip--active' : ''}`}
                        style={buildTagChipStyle(tag, isActive)}
                        onClick={() => toggleTag(tag)}
                        aria-pressed={isActive}
                        aria-label={tag}
                    >
                        {tag}
                    </Button>
                );
            })}

            {/* More / Filters dropdown */}
            <div className="filter-panel__more-wrap" ref={moreRef}>
                <Tooltip content={t('video.filters')} side="bottom">
                    <Button
                        variant="ghost"
                        className={[
                            'filter-panel__more-btn',
                            showMore ? 'filter-panel__more-btn--open' : '',
                            hasAdvancedActiveFilters ? 'filter-panel__more-btn--active' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => setShowMore(v => !v)}
                        aria-expanded={showMore}
                        aria-haspopup="true"
                        aria-label={t('video.filters')}
                    >
                        {hasHiddenTags ? `+${hiddenTags.length}` : t('video.filters')}
                        <ChevronDown size={11} strokeWidth={2.5} className="filter-panel__chevron" />
                    </Button>
                </Tooltip>

                {showMore && (
                    <div className="filter-panel__dropdown">
                        {/* Hidden tags */}
                        {hasHiddenTags && (
                            <div className="filter-panel__dropdown-section">
                                <span className="filter-panel__dropdown-label">{t('video.filter_by_tags')}</span>
                                <div className="filter-panel__dropdown-tags">
                                    {hiddenTags.map(tag => {
                                        const isActive = value.tags.includes(tag);
                                        return (
                                            <Button
                                                key={tag}
                                                variant="ghost"
                                                className={`filter-panel__tag-chip${isActive ? ' filter-panel__tag-chip--active' : ''}`}
                                                style={buildTagChipStyle(tag, isActive)}
                                                onClick={() => toggleTag(tag)}
                                                aria-pressed={isActive}
                                                aria-label={tag}
                                            >
                                                {tag}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Year */}
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

                        {/* Date range */}
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
                                <Button variant="ghost" className="filter-panel__dropdown-clear" onClick={clearFilters}>
                                    {t('video.filter_clear')}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sort group — pushed right via margin-left: auto */}
            <div className="filter-panel__sort-group">
                {SORT_OPTIONS.map(opt => {
                    const isActive = value.sortBy === opt.value;
                    return (
                        <Tooltip key={opt.value} content={t(opt.labelKey)} side="bottom">
                            <Button
                                variant="ghost"
                                className={`filter-panel__sort-btn${isActive ? ' filter-panel__sort-btn--active' : ''}`}
                                onClick={() => onChange({ ...value, sortBy: opt.value })}
                                aria-pressed={isActive}
                                aria-label={t(opt.labelKey)}
                            >
                                {t(opt.labelKey)}
                            </Button>
                        </Tooltip>
                    );
                })}
            </div>

            {/* Clear all */}
            {hasActiveFilters && (
                <Tooltip content={t('video.filter_clear')} side="bottom">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="filter-panel__clear-btn"
                        onClick={clearFilters}
                        aria-label={t('video.filter_clear')}
                    >
                        <X size={12} strokeWidth={2.5} />
                    </Button>
                </Tooltip>
            )}
        </div>
    );
}
