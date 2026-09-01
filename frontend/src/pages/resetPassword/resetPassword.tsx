/* eslint-disable @stylistic/max-len */
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, CheckCircle, AlertCircle } from '@components/icons/icons';
import { Button, Input } from '@ui';
import { auth } from '@api';
import { ROUTES } from '@utils';
import '../login/login.css';

export default function ResetPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { token: tokenParam } = useParams<{ token: string }>();
    const [searchParams] = useSearchParams();

    const token = tokenParam ?? '';
    const email = searchParams.get('email') ?? '';

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        setError('');

        const passwordsMatch = password === passwordConfirmation;
        if (!passwordsMatch) {
            setError(t('auth.reset.passwords_mismatch'));
            return;
        }

        setLoading(true);

        try {
            await auth.resetPassword({ token, email, password, password_confirmation: passwordConfirmation });
            navigate(`${ROUTES.LOGIN}?reset=1`, { replace: true });
        } catch {
            setError(t('auth.reset.error'));
        } finally {
            setLoading(false);
        }
    }

    const isMissingParams = !token || !email;

    return (
        <div className="login-bg">
            <div className="login-card">
                <div className="login-logo-mark">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" role="img" aria-label={t('common.app_name')}>
                        <title>{t('common.app_name')}</title>
                        <polygon points="5,3 19,12 5,21" fill="white" />
                    </svg>
                </div>

                <h1 className="login-title">{t('auth.reset.title')}</h1>
                <p className="login-subtitle">{t('auth.reset.subtitle')}</p>

                {isMissingParams ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
                        <AlertCircle size={40} color="#f87171" strokeWidth={1.5} />
                        <p style={{ color: 'var(--text)', fontSize: '0.9375rem' }}>{t('auth.reset.invalid_link')}</p>
                        <Link to={ROUTES.FORGOT_PASSWORD} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.875rem' }}>
                            {t('auth.reset.request_new')}
                        </Link>
                    </div>
                ) : (
                    <form className="login-form" onSubmit={handleSubmit} noValidate>
                        {error && (
                            <div className="login-error">
                                <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                                {error}
                            </div>
                        )}

                        <Input id="password" label={t('auth.reset.new_password')} type="password" icon={<Lock size={15} strokeWidth={1.75} />} placeholder={t('auth.password_placeholder')} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" autoFocus />
                        <Input id="password_confirmation" label={t('auth.signup.confirm_password')} type="password" icon={<Lock size={15} strokeWidth={1.75} />} placeholder={t('auth.password_placeholder')} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required autoComplete="new-password" />
                        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<CheckCircle size={15} strokeWidth={2} />} style={{ marginTop: 4 }}>
                            {t('auth.reset.submit')}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
