import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, RotateCcw } from '@components/icons/icons';

interface SectionErrorProps {
    onRetry: () => void
    onReload: () => void
    canRetry: boolean
}

export default function SectionError({ onRetry, onReload, canRetry }: SectionErrorProps) {
    const { t } = useTranslation();
    return (
        <div className="error-boundary error-boundary--section">
            <div className="error-boundary__icon-wrap">
                <AlertTriangle size={18} strokeWidth={1.5} />
            </div>
            <div className="error-boundary__body">
                <p className="error-boundary__title">{t('common.error_section_title')}</p>
                <p className="error-boundary__message">{t('common.error_section_message')}</p>
            </div>
            <div className="error-boundary__actions">
                {canRetry
                    ? (
                        <button type="button" className="error-boundary__btn" onClick={onRetry}>
                            <RefreshCw size={11} />
                            {t('common.try_again')}
                        </button>
                    )
                    : (
                        <button type="button" className="error-boundary__btn" onClick={onReload}>
                            <RotateCcw size={11} />
                            {t('common.reload')}
                        </button>
                    )
                }
            </div>
        </div>
    );
}
