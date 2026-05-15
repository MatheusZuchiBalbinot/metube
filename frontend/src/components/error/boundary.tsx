import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@utils/logger';
import { BoundaryLevel } from '@enums/boundaryLevel';



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
        const { hasError, error, retryCount } = this.state;
        const { children, fallback, level = BoundaryLevel.PAGE } = this.props;

        if (!hasError) {
            // key forces remount of children on retry, re-triggering all useEffect / data fetches
            return <Fragment key={retryCount}>{children}</Fragment>;
        }

        if (fallback) {
            return fallback;
        }

        const isPage = level === BoundaryLevel.PAGE;
        const isSection = level === BoundaryLevel.SECTION;
        const hasRetriesLeft = retryCount < MAX_RETRIES;

        if (isPage) {
            return (
                <div className="error-boundary error-boundary--page">
                    <p>{error?.message ?? 'Something went wrong.'}</p>
                    {hasRetriesLeft && (
                        <button onClick={this.handleRetry}>Try again</button>
                    )}
                    <button onClick={this.handleReload}>Reload</button>
                </div>
            );
        }

        if (isSection) {
            return (
                <div className="error-boundary error-boundary--section">
                    <p>Failed to load this section.</p>
                    {hasRetriesLeft
                        ? <button onClick={this.handleRetry}>Try again</button>
                        : <button onClick={this.handleReload}>Reload</button>
                    }
                </div>
            );
        }

        return <span className="error-boundary error-boundary--widget" aria-label="Error" />;
    }
}
