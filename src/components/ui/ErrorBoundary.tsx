import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    onReset?: () => void;
    message?: string;
    fullPage?: boolean;
}

interface State {
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            error,
            errorInfo: null
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by ErrorBoundary:', {
                error,
                errorInfo
            });
        }

        // Call onError prop if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // TODO: Send error to error reporting service (e.g., Sentry)
        // if (process.env.NODE_ENV === 'production') {
        //     captureException(error, { extra: { componentStack: errorInfo.componentStack } });
        // }
    }

    private handleReset = () => {
        this.setState({ error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    public render() {
        if (this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback
                    error={this.state.error}
                    resetErrorBoundary={this.handleReset}
                    message={this.props.message}
                    fullPage={this.props.fullPage}
                />
            );
        }

        return this.props.children;
    }
} 