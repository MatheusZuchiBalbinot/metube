import { useTranslation } from 'react-i18next';
import { Upload, Clock, Tag } from 'lucide-react';
import { useAuth } from '@context/useAuth';
import { Badge, Avatar } from '@ui';
import AppHeader from '@components/header/Header';
import './DashboardPage.css';

const FEATURES = [
    {
        key: 'upload',
        icon: <Upload size={20} strokeWidth={1.75} />,
        titleKey: 'dashboard.feature_upload_title',
        descKey: 'dashboard.feature_upload_desc',
    },
    {
        key: 'transcribe',
        icon: <Clock size={20} strokeWidth={1.75} />,
        titleKey: 'dashboard.feature_transcribe_title',
        descKey: 'dashboard.feature_transcribe_desc',
    },
    {
        key: 'classify',
        icon: <Tag size={20} strokeWidth={1.75} />,
        titleKey: 'dashboard.feature_classify_title',
        descKey: 'dashboard.feature_classify_desc',
    },
] as const;

export default function DashboardPage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    return (
        <div className="dashboard">
            <AppHeader />

            <main className="dashboard-main">
                <div className="welcome-banner">
                    <Avatar name={user?.name ?? '?'} size="lg" />
                    <div className="welcome-text">
                        <h1>{t('dashboard.welcome', { name: user?.name })}</h1>
                        <p>{t('dashboard.welcome_subtitle')}</p>
                    </div>
                </div>

                <div className="feature-grid">
                    {FEATURES.map(({ key, icon, titleKey, descKey }) => (
                        <div key={key} className="feature-card">
                            <div className="feature-card-icon">{icon}</div>
                            <div>
                                <p className="feature-card-title">{t(titleKey)}</p>
                                <p className="feature-card-desc">{t(descKey)}</p>
                            </div>
                            <Badge variant="default">{t('dashboard.coming_soon')}</Badge>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
