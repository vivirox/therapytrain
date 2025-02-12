const VERSION = '1.0.0';
const APP_SHELL_CACHE = `app-shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

const APP_SHELL_FILES = [
    '/',
    '/offline.html',
    '/index.html',
    '/static/css/main.css',
    '/static/js/main.js',
    '/static/js/bundle.js',
    '/static/media/logo.png',
    '/manifest.json'
];

const API_ROUTES = [
    '/api/sessions',
    '/api/profiles',
    '/api/messages'
];

// Cache strategies
const networkFirstStrategy = async (request) => {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, networkResponse.clone());
            return networkResponse;
        }
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        if (request.headers.get('Accept').includes('text/html')) {
            return caches.match('/offline.html');
        }
    }
    return new Response('Network error happened', {
        status: 408,
        headers: { 'Content-Type': 'text/plain' },
    });
};

const cacheFirstStrategy = async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
};

// Install event - cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
            .then((cache) => cache.addAll(APP_SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName.startsWith('app-shell-') ||
                                   cacheName.startsWith('runtime-') ||
                                   cacheName.startsWith('api-');
                        })
                        .filter((cacheName) => {
                            return cacheName !== APP_SHELL_CACHE &&
                                   cacheName !== RUNTIME_CACHE &&
                                   cacheName !== API_CACHE;
                        })
                        .map((cacheName) => caches.delete(cacheName))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API requests
    if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Static assets
    if (request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'image') {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }

    // HTML navigation
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Default - network first
    event.respondWith(networkFirstStrategy(request));
});

// Background Sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-request') {
        event.waitUntil(
            syncData()
        );
    }
});

// Push Notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data.text(),
        icon: '/static/media/logo.png',
        badge: '/static/media/badge.png',
        data: {
            url: '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification('TherapyTrain', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// Periodic Sync
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
        event.waitUntil(
            syncContent()
        );
    }
});

// Helper functions
async function syncData() {
    try {
        const cache = await caches.open(API_CACHE);
        const requests = await cache.keys();
        
        const syncPromises = requests.map(async (request) => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response);
                }
            } catch (error) {
                console.error('Sync failed for request:', request.url);
            }
        });

        await Promise.all(syncPromises);
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

async function syncContent() {
    try {
        const cache = await caches.open(RUNTIME_CACHE);
        const requests = await cache.keys();
        
        const syncPromises = requests.map(async (request) => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response);
                }
            } catch (error) {
                console.error('Content sync failed for request:', request.url);
            }
        });

        await Promise.all(syncPromises);
    } catch (error) {
        console.error('Content sync failed:', error);
    }
}

// Clean up old caches periodically
async function cleanupCaches() {
    const MAX_ITEMS = 100;
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

    try {
        const cache = await caches.open(RUNTIME_CACHE);
        const requests = await cache.keys();
        
        const deletePromises = requests
            .sort((a, b) => {
                const aDate = new Date(a.headers.get('date'));
                const bDate = new Date(b.headers.get('date'));
                return bDate - aDate;
            })
            .slice(MAX_ITEMS)
            .map(request => cache.delete(request));

        const now = Date.now();
        const oldItemsPromises = requests
            .filter(request => {
                const date = new Date(request.headers.get('date'));
                return (now - date.getTime()) > MAX_AGE;
            })
            .map(request => cache.delete(request));

        await Promise.all([...deletePromises, ...oldItemsPromises]);
    } catch (error) {
        console.error('Cache cleanup failed:', error);
    }
}

// Run cleanup every day
setInterval(cleanupCaches, 24 * 60 * 60 * 1000); 