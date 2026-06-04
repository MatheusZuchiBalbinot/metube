import { useTranslation } from 'react-i18next';
import DatePicker from '@ui/date/picker';
import type { FilterState } from '@utils';

interface Props {
    value: FilterState
    onChange: (f: FilterState) => void
}

export default function FilterDateRange({ value, onChange }: Props) {
    const { t } = useTranslation();

    function handleDateFromChange(v: string | null) {
        onChange({ ...value, dateFrom: v });
    }

    function handleDateToChange(v: string | null) {
        onChange({ ...value, dateTo: v });
    }

    return (
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
                        onChange={handleDateFromChange}
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
                        onChange={handleDateToChange}
                        placeholder={t('video.filter_date_to')}
                    />
                </div>
            </div>
        </div>
    );
}
