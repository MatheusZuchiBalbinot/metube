import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@utils/logger';

type BoundaryLevel = 'page' | 'section' | 'widget';

interface Props {
    children: ReactNode
    fallback?: ReactNode
    level?: BoundaryLevel
    onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        const { level = 'page', onError } = this.props;
        logger.error('Unhandled component error', {
            level,
            error: error.message,
            stack: error.stack,
            componentStack: info.componentStack,
        });
        onError?.(error, info);
    }

    private handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        const { hasError, error } = this.state;
        const { children, fallback, level = 'page' } = this.props;

        if (!hasError) {
            return children;
        }

        if (fallback) {
            return fallback;
        }

        const isPage = level === 'page';
        const isSection = level === 'section';

        if (isPage) {
            return (
                <div className="error-boundary error-boundary--page">
                    <p>{error?.message ?? 'Something went wrong.'}</p>
                    <button onClick={() => window.location.reload()}>
                        Reload
                    </button>
                </div>
            );
        }

        if (isSection) {
            return (
                <div className="error-boundary error-boundary--section">
                    <p>Failed to load this section.</p>
                    <button onClick={this.handleReset}>Try again</button>
                </div>
            );
        }

        return <span className="error-boundary error-boundary--widget" aria-label="Error" />;
    }
}
