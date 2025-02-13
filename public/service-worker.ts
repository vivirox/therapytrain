import {
    serviceWorkerConfig,
    getCacheVersion,
    getCacheName,
    getCacheStrategy,
    isRouteAllowedOffline,
} from '../src/config/serviceWorker.config';

declare const self: ServiceWorkerGlobalScope;

const APP_SHELL_CACHE = getCacheName('precache');
const RUNTIME_CACHE = getCacheName('runtime');
const API_CACHE = getCacheName('api');
const VERSION = getCacheVersion();

// Install event - cache app shell
self.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(
        caches
            .open(APP_SHELL_CACHE)
            .then(cache => cache.addAll(serviceWorkerConfig.cache.precache.urls))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName.startsWith('app-shell-') && cacheName !== APP_SHELL_CACHE)
                        .map(cacheName => caches.delete(cacheName))
                );
            }),
        ])
    );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event: FetchEvent) => {
    const { request } = event;
    const url = new URL(request.url);

    // API requests
    if (url.pathname.startsWith('/api/')) {
        const route = url.pathname.split('/')[2]; // Get the API route
        const strategy = getCacheStrategy(route as any);

        switch (strategy) {
            case 'network-first':
                event.respondWith(networkFirstStrategy(request));
                break;
            case 'cache-first':
                event.respondWith(cacheFirstStrategy(request));
                break;
            default:
                event.respondWith(networkFirstStrategy(request));
        }
        return;
    }

    // Static assets
    if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image') {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }

    // HTML navigation
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstStrategy(request));
    }
});

// Background sync
if (serviceWorkerConfig.backgroundSync.enabled) {
    self.addEventListener('sync', (event: SyncEvent) => {
        if (event.tag === serviceWorkerConfig.backgroundSync.queueName) {
            event.waitUntil(syncData());
        }
    });
}

// Push notifications
if (serviceWorkerConfig.pushNotifications.enabled) {
    self.addEventListener('push', (event: PushEvent) => {
        if (!event.data) return;

        const data = event.data.json();
        const options: NotificationOptions = {
            ...data,
            icon: '/static/media/logo.png',
            badge: '/static/media/badge.png',
        };

        event.waitUntil(
            self.registration.showNotification('TherapyTrain', options)
        );
    });

    self.addEventListener('notificationclick', (event: NotificationEvent) => {
        event.notification.close();
        event.waitUntil(
            self.clients.openWindow('/')
        );
    });
}

// Cache strategies
async function networkFirstStrategy(request: Request): Promise<Response> {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(request.url.includes('/api/') ? API_CACHE : RUNTIME_CACHE);
            await cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        throw new Error('Network response was not ok');
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        if (request.mode === 'navigate' && isRouteAllowedOffline(request.url)) {
            return caches.match(serviceWorkerConfig.offline.fallbackPage);
        }
        throw error;
    }
}

async function cacheFirstStrategy(request: Request): Promise<Response> {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(request.url.includes('/api/') ? API_CACHE : RUNTIME_CACHE);
            await cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        throw new Error('Network response was not ok');
    } catch (error) {
        if (request.mode === 'navigate' && isRouteAllowedOffline(request.url)) {
            return caches.match(serviceWorkerConfig.offline.fallbackPage);
        }
        throw error;
    }
}

// Background sync implementation
async function syncData(): Promise<void> {
    const cache = await caches.open('sync-cache');
    const requests = await cache.keys();

    return Promise.all(
        requests.map(async (request) => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                }
            } catch (error) {
                console.error('Sync failed:', error);
            }
        })
    ) as Promise<void>;
}

// Cache cleanup
async function cleanupCache(cacheName: string, maxEntries: number, maxAgeSeconds: number): Promise<void> {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const now = Date.now();

    for (const request of keys) {
        const response = await cache.match(request);
        if (!response) continue;

        const dateHeader = response.headers.get('date');
        if (dateHeader) {
            const date = new Date(dateHeader).getTime();
            if (now - date > maxAgeSeconds * 1000) {
                await cache.delete(request);
                continue;
            }
        }
    }

    if (keys.length > maxEntries) {
        const entriesToDelete = keys.length - maxEntries;
        for (let i = 0; i < entriesToDelete; i++) {
            await cache.delete(keys[i]);
        }
    }
}

// Periodic cache cleanup
setInterval(() => {
    cleanupCache(
        RUNTIME_CACHE,
        serviceWorkerConfig.cache.runtime.maxEntries,
        serviceWorkerConfig.cache.runtime.maxAgeSeconds
    );
    cleanupCache(
        API_CACHE,
        serviceWorkerConfig.cache.api.maxEntries,
        serviceWorkerConfig.cache.api.maxAgeSeconds
    );
}, 60 * 60 * 1000); // Run every hour 