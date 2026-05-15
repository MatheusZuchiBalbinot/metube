import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailCheck, X } from 'lucide-react';
import { auth } from '@api/auth';
import './verificationBanner.css';

export default function EmailVerificationBanner() {
    const { t } = useTranslation();
    const [sent, setSent] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(false);

    if (dismissed) {
        return null;
    }

    async function handleResend() {
        setLoading(true);
        try {
            await auth.resendVerification();
            setSent(true);
        } finally {
            setLoading(false);
        }
    }

    function handleDismiss() {
        setDismissed(true);
    }

    return (
        <div className="verification-banner" role="alert">
            <MailCheck size={16} strokeWidth={1.75} className="verification-banner__icon" />
            <span className="verification-banner__text">
                {sent ? t('auth.verify.sent') : t('auth.verify.prompt')}
            </span>
            {!sent && (
                <button
                    className="verification-banner__action"
                    onClick={handleResend}
                    disabled={loading}
                    type="button"
                >
                    {loading ? t('auth.verify.sending') : t('auth.verify.resend')}
                </button>
            )}
            <button className="verification-banner__dismiss" onClick={handleDismiss} aria-label={t('common.dismiss')} type="button">
                <X size={14} strokeWidth={2} />
            </button>
        </div>
    );
}
