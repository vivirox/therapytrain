import React from 'react';
import { useOffline } from '../hooks/useOffline';
import { toast } from 'react-hot-toast';

interface OfflineIndicatorProps {
    className?: string;
    showToast?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
    className = '',
    showToast = true
}) => {
    const { isOffline, connectionInfo } = useOffline({
        onOffline: () => {
            if (showToast) {
                toast.error('You are offline. Some features may be limited.', {
                    duration: 4000,
                    position: 'bottom-right',
                });
            }
        },
        onOnline: () => {
            if (showToast) {
                toast.success('You are back online!', {
                    duration: 2000,
                    position: 'bottom-right',
                });
            }
        }
    });

    if (!isOffline) {
        return null;
    }

    return (
        <div className={`
            fixed bottom-4 left-4 z-50 
            bg-white dark:bg-gray-800 
            rounded-lg shadow-lg 
            p-4 
            transform transition-all duration-300 ease-in-out
            ${className}
            ${isOffline ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        `}>
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                    <svg
                        className="h-6 w-6 text-yellow-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        You're Offline
                    </h3>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {connectionInfo.type && (
                            <p>
                                Connection: {connectionInfo.type}
                                {connectionInfo.effectiveType && ` (${connectionInfo.effectiveType})`}
                            </p>
                        )}
                        {connectionInfo.saveData && (
                            <p className="text-xs">Data Saver is enabled</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-3 flex justify-end space-x-2">
                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Retry Connection
                </button>
                <a
                    href="/offline.html"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Offline Mode
                </a>
            </div>
        </div>
    );
}; 