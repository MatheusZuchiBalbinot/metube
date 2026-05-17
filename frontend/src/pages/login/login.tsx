/* eslint-disable @stylistic/max-len */
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { Button, Input, Spinner } from '@ui';
import { ROUTES } from '@utils/routes';
import './login.css';

export default function LoginPage() {
    const { t } = useTranslation();
    const { signIn, user, loading: authLoading, sessionError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const resetSuccess = searchParams.get('reset') === '1';

    const from = (location.state as { from?: Location } | null)?.from;
    const returnTo = from ? `${from.pathname}${from.search}${from.hash}` : '/';

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (authLoading) {
        return <Spinner fullPage />;
    }

    if (user) {
        return <Navigate to={returnTo} replace />;
    }

    async function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            navigate(returnTo, { replace: true });
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" role="img" aria-label={t('common.app_name')}>
                        <title>{t('common.app_name')}</title>
                        <polygon points="5,3 19,12 5,21" fill="white" />
                    </svg>
                </div>

                <h1 className="login-title">{t('common.app_name')}</h1>
                <p className="login-subtitle">{t('auth.sign_in_subtitle')}</p>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    {resetSuccess && (
                        <div className="login-error" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', color: '#4ade80' }}>
                            {t('auth.reset.success')}
                        </div>
                    )}
                    {displayError && (
                        <div className="login-error">
                            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                            {displayError}
                        </div>
                    )}

                    <Input id="email" label={t('auth.email')} type="email" icon={<Mail size={15} strokeWidth={1.75} />} placeholder={t('auth.email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Input id="password" label={t('auth.password')} type="password" icon={<Lock size={15} strokeWidth={1.75} />} placeholder={t('auth.password_placeholder')} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                        <Link to={ROUTES.FORGOT_PASSWORD} style={{ fontSize: '0.8125rem', color: 'var(--text-2)', textDecoration: 'none', textAlign: 'right' }}>
                            {t('auth.forgot_password')}
                        </Link>
                    </div>
                    <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<LogIn size={15} strokeWidth={2} />} style={{ marginTop: 4 }}>
                        {t('auth.sign_in')}
                    </Button>
                </form>

                <p className="login-subtitle" style={{ marginTop: 20, marginBottom: 0, textAlign: 'center' }}>
                    {t('auth.no_account')}{' '}
                    <Link to={ROUTES.SIGNUP} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                        {t('auth.signup.title')}
                    </Link>
                </p>
            </div>
        </div>
    );
}
