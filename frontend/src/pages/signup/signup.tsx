/* eslint-disable @stylistic/max-len */
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { Button, Input, Spinner } from '@ui';
import { ROUTES } from '@utils';
import { useAppDispatch } from '@store';
import { signUpThunk } from '@store/authSlice';
import '../login/login.css';
import { useAuth } from '@hooks';

export default function SignupPage() {
    const { t } = useTranslation();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

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
        return <Navigate to="/" replace />;
    }

    async function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        setError('');

        const passwordsMatch = password === passwordConfirmation;
        if (!passwordsMatch) {
            setError(t('auth.signup.passwords_mismatch'));
            return;
        }

        setLoading(true);

        try {
            await dispatch(signUpThunk({ name, email, password, password_confirmation: passwordConfirmation })).unwrap();
            navigate('/', { replace: true });
        } catch {
            setError(t('auth.signup.error'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-bg">
            <div className="login-card">
                <div className="login-logo-mark">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" role="img" aria-label={t('common.app_name')}>
                        <title>{t('common.app_name')}</title>
                        <polygon points="5,3 19,12 5,21" fill="white" />
                    </svg>
                </div>

                <h1 className="login-title">{t('auth.signup.title')}</h1>
                <p className="login-subtitle">{t('auth.signup.subtitle')}</p>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    {error && (
                        <div className="login-error">
                            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                            {error}
                        </div>
                    )}

                    <Input id="name" label={t('auth.signup.name')} type="text" icon={<User size={15} strokeWidth={1.75} />} placeholder={t('auth.signup.name_placeholder')} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" autoFocus />
                    <Input id="email" label={t('auth.email')} type="email" icon={<Mail size={15} strokeWidth={1.75} />} placeholder={t('auth.email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                    <Input id="password" label={t('auth.password')} type="password" icon={<Lock size={15} strokeWidth={1.75} />} placeholder={t('auth.password_placeholder')} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
                    <Input id="password_confirmation" label={t('auth.signup.confirm_password')} type="password" icon={<Lock size={15} strokeWidth={1.75} />} placeholder={t('auth.password_placeholder')} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required autoComplete="new-password" />
                    <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<LogIn size={15} strokeWidth={2} />} style={{ marginTop: 4 }}>
                        {t('auth.signup.submit')}
                    </Button>
                </form>

                <p className="login-subtitle" style={{ marginTop: 20, marginBottom: 0, textAlign: 'center' }}>
                    {t('auth.signup.have_account')}{' '}
                    <Link to={ROUTES.LOGIN} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                        {t('auth.sign_in')}
                    </Link>
                </p>
            </div>
        </div>
    );
}
