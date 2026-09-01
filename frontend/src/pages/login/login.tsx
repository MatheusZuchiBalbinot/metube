import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn, AlertCircle } from '@components/icons/icons';
import { Button, Input, Spinner } from '@ui';
import { ROUTES } from '@utils';
import './login.css';
import { useAuth } from '@hooks';

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
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
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
    // Autofill can populate this field on mount without firing React's onChange;
    // "new-password" (unlike autoComplete="off") reliably suppresses that here.
    const passwordAutoComplete = sessionError ? 'new-password' : 'current-password';

    return (
        <div className="login-bg">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo-mark">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" role="img" aria-label={t('common.app_name')}>
                            <title>{t('common.app_name')}</title>
                            <polygon points="5,3 19,12 5,21" fill="white" />
                        </svg>
                    </div>
                    <h1 className="login-title">{t('common.app_name')}</h1>
                    <p className="login-subtitle">{t('auth.sign_in_subtitle')}</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    {resetSuccess && (
                        <div className="login-error login-error--success">
                            {t('auth.reset.success')}
                        </div>
                    )}
                    {displayError && (
                        <div className={`login-error${sessionError ? ' login-error--info' : ''}`}>
                            <AlertCircle size={14} strokeWidth={2} className="login-error__icon" />
                            <span>
                                {displayError}
                                {sessionError && from && (
                                    <span className="login-error__hint"> {t('auth.session_expired_hint')}</span>
                                )}
                            </span>
                        </div>
                    )}

                    <Input
                        id="email"
                        label={t('auth.email')}
                        type="email"
                        icon={<Mail size={15} strokeWidth={1.75} />}
                        placeholder={t('auth.email_placeholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                    />
                    <div className="login-password-row">
                        <Input
                            id="password"
                            label={t('auth.password')}
                            type="password"
                            icon={<Lock size={15} strokeWidth={1.75} />}
                            placeholder={t('auth.password_placeholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete={passwordAutoComplete}
                        />
                        <Link to={ROUTES.FORGOT_PASSWORD} className="login-forgot-link">
                            {t('auth.forgot_password')}
                        </Link>
                    </div>
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        rightIcon={<LogIn size={15} strokeWidth={2} />}
                        className="login-submit"
                    >
                        {t('auth.sign_in')}
                    </Button>
                </form>

                <div className="login-footer">
                    <p className="login-footer__text">
                        {t('auth.no_account')}{' '}
                        <Link to={ROUTES.SIGNUP} className="login-footer__link">
                            {t('auth.signup.title')}
                        </Link>
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate(ROUTES.HOME)}
                        className="login-guest-link"
                    >
                        {t('auth.continue_as_guest')}
                    </button>
                </div>
            </div>
        </div>
    );
}
