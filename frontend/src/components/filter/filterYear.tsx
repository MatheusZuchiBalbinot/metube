import { useTranslation } from 'react-i18next';
import type { FilterState } from '@utils';

interface Props {
    value: FilterState
    onChange: (f: FilterState) => void
}

const YEAR_OPTIONS = Array.from(
    { length: new Date().getFullYear() - 2019 },
    (_, i) => new Date().getFullYear() - i,
);

export default function FilterYear({ value, onChange }: Props) {
    const { t } = useTranslation();

    function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
        onChange({ ...value, year: e.target.value === '' ? null : Number(e.target.value) });
    }

    return (
        <div className="filter-panel__dropdown-section">
            <label className="filter-panel__dropdown-label" htmlFor="fp-year">
                {t('video.filter_year')}
            </label>
            <select
                id="fp-year"
                className="filter-panel__year-select"
                value={value.year ?? ''}
                onChange={handleYearChange}
            >
                <option value="">{t('video.filter_all_years')}</option>
                {YEAR_OPTIONS.map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>
        </div>
    );
}
