import { useTranslation } from 'react-i18next';
import type { FilterState } from '@utils';
import { QuickRangeKind } from '@enums/quickRangeKind';

interface Props {
    value: FilterState
    onChange: (f: FilterState) => void
}

const QUICK_RANGE_PRESETS: { key: QuickRangeKind; labelKey: string }[] = [
    { key: QuickRangeKind.LAST_7D, labelKey: 'video.filter_last_7d' },
    { key: QuickRangeKind.LAST_30D, labelKey: 'video.filter_last_30d' },
    { key: QuickRangeKind.LAST_90D, labelKey: 'video.filter_last_90d' },
    { key: QuickRangeKind.THIS_YEAR, labelKey: 'video.filter_this_year' },
];

function toIsoDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function computeQuickRange(kind: QuickRangeKind): { from: string; to: string } {
    const today = new Date();
    const to = toIsoDate(today);

    if (kind === QuickRangeKind.THIS_YEAR) {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { from: toIsoDate(yearStart), to };
    }

    const dayMap: Record<Exclude<QuickRangeKind, typeof QuickRangeKind.THIS_YEAR>, number> = {
        last7d: 7,
        last30d: 30,
        last90d: 90,
    };
    const days = dayMap[kind];
    const from = new Date(today);
    from.setDate(from.getDate() - days);

    return { from: toIsoDate(from), to };
}

function detectActiveQuickRange(dateFrom: string | null, dateTo: string | null): QuickRangeKind | null {
    const hasNoRange = dateFrom === null || dateTo === null;

    if (hasNoRange) {
        return null;
    }

    for (const preset of QUICK_RANGE_PRESETS) {
        const range = computeQuickRange(preset.key);
        const isMatch = range.from === dateFrom && range.to === dateTo;

        if (isMatch) {
            return preset.key;
        }
    }

    return null;
}

export default function FilterQuickRange({ value, onChange }: Props) {
    const { t } = useTranslation();
    const activeQuickRange = detectActiveQuickRange(value.dateFrom, value.dateTo);

    function handleQuickRange(kind: QuickRangeKind) {
        const range = computeQuickRange(kind);
        onChange({ ...value, dateFrom: range.from, dateTo: range.to });
    }

    return (
        <div className="filter-panel__dropdown-section">
            <span className="filter-panel__dropdown-label">{t('video.filter_quick_range')}</span>
            <div className="filter-panel__quick-range-group">
                {QUICK_RANGE_PRESETS.map(preset => {
                    const isActive = activeQuickRange === preset.key;

                    return (
                        <button
                            key={preset.key}
                            type="button"
                            className={`filter-panel__quick-range-chip${isActive ? ' filter-panel__quick-range-chip--active' : ''}`}
                            onClick={() => handleQuickRange(preset.key)}
                            aria-pressed={isActive}
                        >
                            {t(preset.labelKey)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
