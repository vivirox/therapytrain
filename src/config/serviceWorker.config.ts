interface CacheConfig {
    maxEntries: number;
    maxAgeSeconds: number;
    patterns: {
        sessions: string[];
        profiles: string[];
        messages: string[];
    };
}

interface SyncConfig {
    enabled: boolean;
    interval: number; // in milliseconds
    maxRetries: number;
    backgroundSync: boolean;
}

interface PushConfig {
    enabled: boolean;
    publicKey: string;
    privateKey: string;
    userVisibleOnly: boolean;
    applicationServerKey?: string;
}

interface DebugConfig {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug';
    logToServer: boolean;
}

interface ServiceWorkerConfig {
    version: string;
    debug: DebugConfig;
    cache: CacheConfig;
    sync: SyncConfig;
    push: PushConfig;
    routes: {
        offline: string;
        fallback: string;
    };
    assets: {
        precache: string[];
        dynamic: string[];
    };
}

export const serviceWorkerConfig: ServiceWorkerConfig = {
    version: '1.0.0',
    debug: {
        enabled: process.env.NODE_ENV === 'development',
        level: 'info',
        logToServer: false
    },
    cache: {
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        patterns: {
            sessions: [
                '/api/sessions*',
                '/api/sessions/*'
            ],
            profiles: [
                '/api/profiles*',
                '/api/profiles/*'
            ],
            messages: [
                '/api/messages*',
                '/api/messages/*'
            ]
        }
    },
    sync: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000, // 24 hours
        maxRetries: 3,
        backgroundSync: true
    },
    push: {
        enabled: true,
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
        privateKey: process.env.VAPID_PRIVATE_KEY || '',
        userVisibleOnly: true
    },
    routes: {
        offline: '/offline.html',
        fallback: '/offline.html'
    },
    assets: {
        precache: [
            '/',
            '/offline.html',
            '/static/css/main.css',
            '/static/js/main.js',
            '/static/js/bundle.js',
            '/static/media/logo.png',
            '/manifest.json'
        ],
        dynamic: [
            '/api/*',
            '/static/*',
            'https://fonts.googleapis.com/*',
            'https://fonts.gstatic.com/*'
        ]
    }
};

// Type definitions
export type ServiceWorkerConfig = typeof serviceWorkerConfig;

// Helper functions
export const getCacheVersion = () => serviceWorkerConfig.version;

export const getCacheName = (type: keyof typeof serviceWorkerConfig.cache) => {
    return serviceWorkerConfig.cache[type].name;
};

export const getCacheStrategy = (route: keyof typeof serviceWorkerConfig.cache.api.strategies) => {
    return serviceWorkerConfig.cache.api.strategies[route];
};

export const isFeatureSupported = (feature: keyof typeof serviceWorkerConfig.features): boolean => {
    return serviceWorkerConfig.features[feature];
};

export const isRouteAllowedOffline = (route: string): boolean => {
    return serviceWorkerConfig.offline.allowedRoutes.some(
        allowedRoute => route.startsWith(allowedRoute)
    );
};

export const shouldEnableBackgroundSync = (): boolean => {
    return serviceWorkerConfig.backgroundSync.enabled && isFeatureSupported('backgroundSync');
};

export const shouldEnablePushNotifications = (): boolean => {
    return serviceWorkerConfig.pushNotifications.enabled && isFeatureSupported('pushManager');
};

export default serviceWorkerConfig; 