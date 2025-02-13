import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Container } from '../layout/Container';

interface ErrorFallbackProps {
    error: Error;
    resetErrorBoundary?: () => void;
    message?: string;
    showReset?: boolean;
    fullPage?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
    error,
    resetErrorBoundary,
    message = 'Something went wrong',
    showReset = true,
    fullPage = false
}) => {
    const content = (
        <div className="flex flex-col items-center justify-center p-6 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {message}
            </h2>
            <p className="text-sm text-gray-600 mb-4 max-w-md">
                {error.message}
            </p>
            {showReset && resetErrorBoundary && (
                <button
                    onClick={resetErrorBoundary}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                    Try Again
                </button>
            )}
        </div>
    );

    if (fullPage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Container maxWidth="lg">
                    {content}
                </Container>
            </div>
        );
    }

    return content;
}; 