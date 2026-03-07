import { useTranslation } from 'react-i18next';
import { ThumbsUp } from 'lucide-react';
import './liked.css';

export default function LikedPage() {
    const { t } = useTranslation();

    return (
        <div className="liked-page">
            <div className="liked-page__empty">
                <ThumbsUp size={40} strokeWidth={1.25} className="liked-page__empty-icon" />
                <p className="liked-page__empty-title">{t('nav.liked_videos')}</p>
                <p className="liked-page__empty-text">{t('dashboard.coming_soon')}</p>
            </div>
        </div>
    );
}
