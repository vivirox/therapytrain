import { useState, useEffect } from 'react';

interface UseOfflineOptions {
    onOffline?: () => void;
    onOnline?: () => void;
}

export const useOffline = (options: UseOfflineOptions = {}) => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const { onOffline, onOnline } = options;

    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
            onOffline?.();
        };

        const handleOnline = () => {
            setIsOffline(false);
            onOnline?.();
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // Check connection status periodically
        const checkConnection = async () => {
            try {
                const response = await fetch('/api/health-check', {
                    method: 'HEAD'
                });
                setIsOffline(!response.ok);
            } catch (error) {
                setIsOffline(true);
            }
        };

        const connectionCheckInterval = setInterval(checkConnection, 30000); // Check every 30 seconds

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            clearInterval(connectionCheckInterval);
        };
    }, [onOffline, onOnline]);

    return {
        isOffline,
        // Helper methods
        checkConnection: async () => {
            try {
                const response = await fetch('/api/health-check', {
                    method: 'HEAD'
                });
                return response.ok;
            } catch (error) {
                return false;
            }
        },
        // Additional network information if available
        connectionInfo: {
            type: 'connection' in navigator && (navigator as any).connection?.type,
            effectiveType: 'connection' in navigator && (navigator as any).connection?.effectiveType,
            downlink: 'connection' in navigator && (navigator as any).connection?.downlink,
            rtt: 'connection' in navigator && (navigator as any).connection?.rtt,
            saveData: 'connection' in navigator && (navigator as any).connection?.saveData
        }
    };
}; 