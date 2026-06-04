import { useTranslation } from 'react-i18next';
import { SORT_OPTIONS, type FilterState } from '@utils';

interface Props {
    value: FilterState
    onChange: (f: FilterState) => void
}

export default function FilterSort({ value, onChange }: Props) {
    const { t } = useTranslation();

    return (
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
    );
}
