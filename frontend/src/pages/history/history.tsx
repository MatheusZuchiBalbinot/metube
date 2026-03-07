import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import './history.css';

export default function HistoryPage() {
    const { t } = useTranslation();

    return (
        <div className="history-page">
            <div className="history-page__empty">
                <History size={40} strokeWidth={1.25} className="history-page__empty-icon" />
                <p className="history-page__empty-title">{t('nav.history')}</p>
                <p className="history-page__empty-text">{t('video.no_history_title')}</p>
            </div>
        </div>
    );
}
