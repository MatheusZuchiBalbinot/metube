import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, RotateCcw } from '@components/icons/icons';

interface PageErrorProps {
    onRetry: () => void
    onReload: () => void
    canRetry: boolean
}

export default function PageError({ onRetry, onReload, canRetry }: PageErrorProps) {
    const { t } = useTranslation();
    return (
        <div className="error-boundary error-boundary--page">
            <div className="error-boundary__page-glow" aria-hidden="true" />
            <div className="error-boundary__page-icon">
                <AlertTriangle size={36} strokeWidth={1} />
            </div>
            <h1 className="error-boundary__page-title">{t('common.error_page_title')}</h1>
            <p className="error-boundary__page-message">{t('common.error_page_message')}</p>
            <div className="error-boundary__page-actions">
                {canRetry && (
                    <button type="button" className="error-boundary__btn error-boundary__btn--primary" onClick={onRetry}>
                        <RefreshCw size={13} />
                        {t('common.try_again')}
                    </button>
                )}
                <button type="button" className="error-boundary__btn error-boundary__btn--ghost" onClick={onReload}>
                    <RotateCcw size={13} />
                    {t('common.reload')}
                </button>
            </div>
        </div>
    );
}
