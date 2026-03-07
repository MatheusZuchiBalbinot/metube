import { useTranslation } from 'react-i18next';
import { ListVideo } from 'lucide-react';
import './playlists.css';

export default function PlaylistsPage() {
    const { t } = useTranslation();

    return (
        <div className="playlists-page">
            <div className="playlists-page__empty">
                <ListVideo size={40} strokeWidth={1.25} className="playlists-page__empty-icon" />
                <p className="playlists-page__empty-title">{t('nav.playlists')}</p>
                <p className="playlists-page__empty-text">{t('dashboard.coming_soon')}</p>
            </div>
        </div>
    );
}
