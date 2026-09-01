import { useTranslation } from 'react-i18next';
import { Search, X } from '@components/icons/icons';
import { cn } from '@utils';
import { HistoryPeriod } from '@models';
import type { HistoryPeriod as HistoryPeriodType } from '@models';

const PERIODS: { value: HistoryPeriodType; labelKey: string }[] = [
    { value: HistoryPeriod.ALL, labelKey: 'history.period_all' },
    { value: HistoryPeriod.TODAY, labelKey: 'history.period_today' },
    { value: HistoryPeriod.WEEK, labelKey: 'history.period_week' },
    { value: HistoryPeriod.MONTH, labelKey: 'history.period_month' },
];

interface Props {
    searchQuery: string
    selectedPeriod: HistoryPeriodType
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSearchClear: () => void
    onPeriodChange: (period: HistoryPeriodType) => void
}

export default function HistoryControls({
    searchQuery,
    selectedPeriod,
    onSearchChange,
    onSearchClear,
    onPeriodChange,
}: Props) {
    const { t } = useTranslation();
    const hasSearchText = searchQuery.length > 0;

    return (
        <div className="history-page__controls">
            <div className="history-page__search-wrap">
                <Search size={14} className="history-page__search-icon" />
                <input
                    type="text"
                    className="history-page__search"
                    placeholder={t('history.search_placeholder')}
                    value={searchQuery}
                    onChange={onSearchChange}
                    aria-label={t('history.search_placeholder')}
                />
                {hasSearchText && (
                    <button
                        className="history-page__search-clear"
                        onClick={onSearchClear}
                        aria-label={t('common.close')}
                        type="button"
                    >
                        <X size={12} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            <div className="history-page__periods" role="group" aria-label={t('history.period_label')}>
                {PERIODS.map(p => {
                    const isActive = selectedPeriod === p.value;
                    return (
                        <button
                            key={p.value}
                            type="button"
                            className={cn('history-page__period-btn', isActive && 'history-page__period-btn--active')}
                            onClick={() => onPeriodChange(p.value)}
                            aria-pressed={isActive}
                        >
                            {t(p.labelKey)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
