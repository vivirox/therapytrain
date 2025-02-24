import { useState, useCallback } from 'react';

interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
}

interface RetryState {
    attempts: number;
    isRetrying: boolean;
    error: Error | null;
}

export function useRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
) {
    const {
        maxAttempts = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2
    } = options;

    const [state, setState] = useState<RetryState>({
        attempts: 0,
        isRetrying: false,
        error: null
    });

    const calculateDelay = useCallback((attempt: number) => {
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        return Math.min(delay, maxDelay);
    }, [initialDelay, maxDelay, backoffFactor]);

    const execute = useCallback(async (): Promise<T> => {
        setState(prev => ({ ...prev, isRetrying: true, error: null }));

        try {
            const result = await operation();
            setState(prev => ({ ...prev, isRetrying: false, attempts: 0 }));
            return result;
        } catch (error) {
            if (state.attempts >= maxAttempts - 1) {
                setState(prev => ({
                    ...prev,
                    isRetrying: false,
                    error: error instanceof Error ? error : new Error('Operation failed')
                }));
                throw error;
            }

            // Calculate delay for next retry
            const delay = calculateDelay(state.attempts);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));

            // Increment attempts and retry
            setState(prev => ({
                ...prev,
                attempts: prev.attempts + 1
            }));

            return execute();
        }
    }, [operation, state.attempts, maxAttempts, calculateDelay]);

    const reset = useCallback(() => {
        setState({
            attempts: 0,
            isRetrying: false,
            error: null
        });
    }, []);

    return {
        execute,
        reset,
        attempts: state.attempts,
        isRetrying: state.isRetrying,
        error: state.error
    };
} 