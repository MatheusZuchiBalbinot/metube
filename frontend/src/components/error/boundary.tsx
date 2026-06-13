import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { t } from 'i18next';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { logger } from '@utils';
import { BoundaryLevel } from '@enums/boundaryLevel';
import './boundary.css';

const MAX_RETRIES = 3;

interface Props {
    children: ReactNode
    fallback?: ReactNode
    level?: BoundaryLevel
    onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error: Error | null
    retryCount: number
}

interface SectionErrorProps {
    onRetry: () => void
    onReload: () => void
    canRetry: boolean
}

function SectionError({ onRetry, onReload, canRetry }: SectionErrorProps) {
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

interface PageErrorProps {
    onRetry: () => void
    onReload: () => void
    canRetry: boolean
}

function PageError({ onRetry, onReload, canRetry }: PageErrorProps) {
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

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, retryCount: 0 };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        const { level = BoundaryLevel.PAGE, onError } = this.props;
        logger.error('Unhandled component error', {
            level,
            error: error.message,
            stack: error.stack,
            componentStack: info.componentStack,
        });
        onError?.(error, info);
    }

    private handleRetry = (): void => {
        this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
    };

    private handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        const { hasError, retryCount } = this.state;
        const { children, fallback, level = BoundaryLevel.PAGE } = this.props;

        if (!hasError) {
            return <Fragment key={retryCount}>{children}</Fragment>;
        }

        if (fallback) {
            return fallback;
        }

        const isPage = level === BoundaryLevel.PAGE;
        const isSection = level === BoundaryLevel.SECTION;
        const hasRetriesLeft = retryCount < MAX_RETRIES;

        if (isSection) {
            return (
                <SectionError
                    onRetry={this.handleRetry}
                    onReload={this.handleReload}
                    canRetry={hasRetriesLeft}
                />
            );
        }

        if (isPage) {
            return (
                <PageError
                    onRetry={this.handleRetry}
                    onReload={this.handleReload}
                    canRetry={hasRetriesLeft}
                />
            );
        }

        return <span className="error-boundary error-boundary--widget" aria-label={t('common.error_widget_label')} />;
    }
}
