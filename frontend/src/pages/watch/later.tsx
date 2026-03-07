import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import './later.css';

export default function WatchLaterPage() {
    const { t } = useTranslation();

    return (
        <div className="watch-later-page">
            <div className="watch-later-page__empty">
                <Clock size={40} strokeWidth={1.25} className="watch-later-page__empty-icon" />
                <p className="watch-later-page__empty-title">{t('nav.watch_later')}</p>
                <p className="watch-later-page__empty-text">{t('dashboard.coming_soon')}</p>
            </div>
        </div>
    );
}
