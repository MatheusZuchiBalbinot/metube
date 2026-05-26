import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, LogIn, AlertCircle, UserRound } from 'lucide-react';
import { Button, Input, Spinner } from '@ui';
import { ROUTES } from '@utils';
import '../login/login.css';
import { useAuth } from '@hooks';

export default function SignupPage() {
    const { t } = useTranslation();
    const { signUp, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (authLoading) {
        return <Spinner fullPage />;
    }

    if (user) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    async function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        setError('');

        const isPasswordMismatch = password !== passwordConfirmation;

        if (isPasswordMismatch) {
            setError(t('auth.signup.passwords_mismatch'));
            return;
        }

        setLoading(true);

        try {
            await signUp(name, email, password, passwordConfirmation);
            navigate(ROUTES.HOME, { replace: true });
        } catch {
            setError(t('auth.signup.error'));
        } finally {
            setLoading(false);
        }
    }

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
                    <h1 className="login-title">{t('auth.signup.title')}</h1>
                    <p className="login-subtitle">{t('auth.signup.subtitle')}</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    {error && (
                        <div className="login-error">
                            <AlertCircle size={14} strokeWidth={2} className="login-error__icon" />
                            {error}
                        </div>
                    )}

                    <Input
                        id="name"
                        label={t('auth.signup.name')}
                        type="text"
                        icon={<User size={15} strokeWidth={1.75} />}
                        placeholder={t('auth.signup.name_placeholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        autoFocus
                    />
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
                    />
                    <Input
                        id="password"
                        label={t('auth.password')}
                        type="password"
                        icon={<Lock size={15} strokeWidth={1.75} />}
                        placeholder={t('auth.password_placeholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <Input
                        id="password_confirmation"
                        label={t('auth.signup.confirm_password')}
                        type="password"
                        icon={<Lock size={15} strokeWidth={1.75} />}
                        placeholder={t('auth.password_placeholder')}
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        rightIcon={<LogIn size={15} strokeWidth={2} />}
                        className="login-submit"
                    >
                        {t('auth.signup.submit')}
                    </Button>
                </form>

                <div className="login-footer">
                    <p className="login-footer__text">
                        {t('auth.have_account')}{' '}
                        <Link to={ROUTES.LOGIN} className="login-footer__link">
                            {t('auth.sign_in')}
                        </Link>
                    </p>
                    <div className="login-divider">{t('common.or', 'or')}</div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        fullWidth
                        onClick={() => navigate(ROUTES.HOME)}
                        leftIcon={<UserRound size={15} strokeWidth={1.75} />}
                        className="login-guest-btn"
                    >
                        {t('auth.continue_as_guest')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
