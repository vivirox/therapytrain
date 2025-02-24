import { useState, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';

interface ErrorState {
    error: Error | null;
    componentStack?: string;
}

export function useErrorHandler() {
    const [errorState, setErrorState] = useState<ErrorState>({ error: null });
    const { showToast } = useToast();

    const handleError = useCallback((error: unknown, componentStack?: string) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        
        setErrorState({ error: normalizedError, componentStack });
        
        // Show toast for non-fatal errors
        if (!componentStack) {
            showToast('error', normalizedError.message);
        }

        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by useErrorHandler:', {
                error: normalizedError,
                componentStack
            });
        }

        // TODO: Send error to error reporting service (e.g., Sentry)
        // if (process.env.NODE_ENV === 'production') {
        //     captureException(normalizedError, { extra: { componentStack } });
        // }

        return normalizedError;
    }, [showToast]);

    const clearError = useCallback(() => {
        setErrorState({ error: null });
    }, []);

    const throwError = useCallback((error: unknown) => {
        const normalizedError = handleError(error);
        throw normalizedError;
    }, [handleError]);

    return {
        error: errorState.error,
        componentStack: errorState.componentStack,
        handleError,
        clearError,
        throwError,
        hasError: errorState.error !== null
    };
} 