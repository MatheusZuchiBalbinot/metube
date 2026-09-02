import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { t } from 'i18next';
import { logger } from '@utils';
import { BoundaryLevel } from '@enums/boundaryLevel';
import SectionError from './sectionError';
import PageError from './pageError';
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
