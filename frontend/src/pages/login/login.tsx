import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@context/useAuth';
import { Button, Input, Spinner } from '@ui';
import './login.css';

export default function LoginPage() {
    const { t } = useTranslation();
    const { signIn, user, loading: authLoading, sessionError } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (authLoading) {
        return <Spinner fullPage />;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    async function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            navigate('/', { replace: true });
        } catch {
            setError(t('auth.invalid_credentials'));
        } finally {
            setLoading(false);
        }
    }

    const displayError = sessionError || error;

    return (
        <div className="login-bg">
            <div className="login-card">

                <div className="login-logo-mark">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <polygon points="5,3 19,12 5,21" fill="white" />
                    </svg>
                </div>

                <h1 className="login-title">{t('common.app_name')}</h1>
                <p className="login-subtitle">{t('auth.sign_in_subtitle')}</p>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    {displayError && (
                        <div className="login-error">
                            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                            {displayError}
                        </div>
                    )}

                    <Input id="email" label={t('auth.email')} type="email" icon={<Mail size={15} strokeWidth={1.75} />} placeholder={t('auth.email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
                    <Input id="password" label={t('auth.password')} type="password" icon={<Lock size={15} strokeWidth={1.75} />} placeholder={t('auth.password_placeholder')} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                    <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<LogIn size={15} strokeWidth={2} />} style={{ marginTop: 4 }}>
                        {t('auth.sign_in')}
                    </Button>
                </form>
            </div>
        </div>
    );
}
