import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Play, Upload, Clock, Download, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button, Badge, Avatar } from '../components/ui'
import './dashboard.css'

const FEATURES = [
    {
        key: 'upload',
        icon: <Upload size={20} strokeWidth={1.75} />,
        titleKey: 'dashboard.feature_upload_title',
        descKey:  'dashboard.feature_upload_desc',
    },
    {
        key: 'summarize',
        icon: <Clock size={20} strokeWidth={1.75} />,
        titleKey: 'dashboard.feature_summarize_title',
        descKey:  'dashboard.feature_summarize_desc',
    },
    {
        key: 'export',
        icon: <Download size={20} strokeWidth={1.75} />,
        titleKey: 'dashboard.feature_export_title',
        descKey:  'dashboard.feature_export_desc',
    },
] as const

export default function DashboardPage() {
    const { t } = useTranslation()
    const { user, signOut } = useAuth()
    const navigate = useNavigate()

    async function handleLogout() {
        await signOut()
        navigate('/login', { replace: true })
    }

    return (
        <div className="dashboard">
            {/* Nav */}
            <nav className="nav">
                <div className="nav-brand">
                    <div className="nav-brand-icon">
                        <Play size={15} fill="white" strokeWidth={0} />
                    </div>
                    <span className="nav-brand-name">{t('common.app_name')}</span>
                </div>

                <div className="nav-right">
                    <Avatar name={user?.name ?? '?'} size="sm" />
                    <span className="nav-username">{user?.name}</span>
                    <div className="nav-divider" />
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<LogOut size={14} strokeWidth={1.75} />}
                        onClick={handleLogout}
                    >
                        {t('common.sign_out')}
                    </Button>
                </div>
            </nav>

            {/* Content */}
            <main className="dashboard-main">
                {/* Welcome banner */}
                <div className="welcome-banner">
                    <Avatar name={user?.name ?? '?'} size="lg" />
                    <div className="welcome-text">
                        <h1>{t('dashboard.welcome', { name: user?.name })}</h1>
                        <p>{t('dashboard.welcome_subtitle')}</p>
                    </div>
                </div>

                {/* Feature cards */}
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
    )
}
