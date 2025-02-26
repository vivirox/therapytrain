/**
 * Service Worker Configuration
 */

export interface ServiceWorkerConfig {
    enabled: boolean;
    scope: string;
    debug: {
        enabled: boolean;
        level: 'error' | 'warn' | 'info' | 'debug';
    };
    registration: {
        strategy: 'registerWhenStable' | 'registerImmediately';
        timeout: number;
    };
    backgroundSync: {
        enabled: boolean;
        queueName: string;
        maxRetries: number;
        interval: number;
    };
    pushNotifications: {
        enabled: boolean;
        publicKey: string;
        options: {
            userVisibleOnly: boolean;
            applicationServerKey: string;
        };
    };
    caching: {
        enabled: boolean;
        strategy: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate';
        maxEntries: number;
        maxAgeSeconds: number;
    };
    offline: {
        enabled: boolean;
        fallbackPage: string;
    };
}

export const serviceWorkerConfig: ServiceWorkerConfig = {
    enabled: true,
    scope: '/',
    debug: {
        enabled: process.env.NODE_ENV === 'development',
        level: 'info',
    },
    registration: {
        strategy: 'registerWhenStable',
        timeout: 30000
    },
    backgroundSync: {
        enabled: true,
        queueName: 'backgroundSync',
        maxRetries: 5,
        interval: 60000,
    },
    pushNotifications: {
        enabled: true,
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
        options: {
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
        }
    },
    caching: {
        enabled: true,
        strategy: 'networkFirst',
        maxEntries: 100,
        maxAgeSeconds: 86400
    },
    offline: {
        enabled: true,
        fallbackPage: '/offline'
    }
}