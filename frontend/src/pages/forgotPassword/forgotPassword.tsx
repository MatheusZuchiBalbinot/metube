/* eslint-disable @stylistic/max-len */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Input } from '@ui';
import { auth } from '@api';
import { ROUTES } from '@utils';
import '../login/login.css';

export default function ForgotPasswordPage() {
    const { t } = useTranslation();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await auth.forgotPassword({ email });
            setSent(true);
        } catch {
            setError(t('auth.forgot.error'));
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

                <h1 className="login-title">{t('auth.forgot.title')}</h1>
                <p className="login-subtitle">{t('auth.forgot.subtitle')}</p>

                {sent ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
                        <CheckCircle size={40} color="var(--accent)" strokeWidth={1.5} />
                        <p style={{ color: 'var(--text)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
                            {t('auth.forgot.sent', { email })}
                        </p>
                        <Link to={ROUTES.LOGIN} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.875rem' }}>
                            {t('auth.forgot.back_to_login')}
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

                        <Input id="email" label={t('auth.email')} type="email" icon={<Mail size={15} strokeWidth={1.75} />} placeholder={t('auth.email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
                        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<Send size={15} strokeWidth={2} />} style={{ marginTop: 4 }}>
                            {t('auth.forgot.submit')}
                        </Button>

                        <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '0.875rem', marginTop: 4 }}>
                            <Link to={ROUTES.LOGIN} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                {t('auth.forgot.back_to_login')}
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
