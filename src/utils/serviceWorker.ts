import { serviceWorkerConfig } from '../config/serviceWorker.config';

class ServiceWorkerManager {
    private static instance: ServiceWorkerManager;
    private registration: ServiceWorkerRegistration | null = null;

    private constructor() {}

    public static getInstance(): ServiceWorkerManager {
        if (!ServiceWorkerManager.instance) {
            ServiceWorkerManager.instance = new ServiceWorkerManager();
        }
        return ServiceWorkerManager.instance;
    }

    /**
     * Register the service worker
     */
    public async register(): Promise<void> {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service workers are not supported');
            return;
        }

        try {
            this.registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/',
            });

            if (serviceWorkerConfig.debug.enabled) {
                console.log('Service Worker registered successfully');
            }

            await this.setupFeatures();
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    /**
     * Setup service worker features
     */
    private async setupFeatures(): Promise<void> {
        if (!this.registration) return;

        // Setup background sync
        if (serviceWorkerConfig.backgroundSync.enabled) {
            try {
                await this.registration.sync.register(serviceWorkerConfig.backgroundSync.queueName);
                if (serviceWorkerConfig.debug.enabled) {
                    console.log('Background sync registered successfully');
                }
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        }

        // Setup push notifications
        if (serviceWorkerConfig.pushNotifications.enabled) {
            try {
                const subscription = await this.registration.pushManager.subscribe(
                    serviceWorkerConfig.pushNotifications.options
                );
                if (serviceWorkerConfig.debug.enabled) {
                    console.log('Push notification subscription:', subscription);
                }
            } catch (error) {
                console.error('Push notification subscription failed:', error);
            }
        }
    }

    /**
     * Update the service worker
     */
    public async update(): Promise<void> {
        if (!this.registration) return;

        try {
            await this.registration.update();
            if (serviceWorkerConfig.debug.enabled) {
                console.log('Service Worker updated successfully');
            }
        } catch (error) {
            console.error('Service Worker update failed:', error);
        }
    }

    /**
     * Unregister the service worker
     */
    public async unregister(): Promise<void> {
        if (!this.registration) return;

        try {
            await this.registration.unregister();
            if (serviceWorkerConfig.debug.enabled) {
                console.log('Service Worker unregistered successfully');
            }
        } catch (error) {
            console.error('Service Worker unregistration failed:', error);
        }
    }

    /**
     * Check if service worker is supported
     */
    public isSupported(): boolean {
        return 'serviceWorker' in navigator;
    }

    /**
     * Get the service worker registration
     */
    public getRegistration(): ServiceWorkerRegistration | null {
        return this.registration;
    }

    /**
     * Add a request to background sync queue
     */
    public async addToSyncQueue(request: Request): Promise<void> {
        if (!this.registration || !serviceWorkerConfig.backgroundSync.enabled) return;

        const cache = await caches.open('sync-cache');
        await cache.put(request.url, request);

        try {
            await this.registration.sync.register(serviceWorkerConfig.backgroundSync.queueName);
        } catch (error) {
            console.error('Failed to register sync:', error);
        }
    }

    /**
     * Subscribe to push notifications
     */
    public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
        if (!this.registration || !serviceWorkerConfig.pushNotifications.enabled) return null;

        try {
            const subscription = await this.registration.pushManager.subscribe(
                serviceWorkerConfig.pushNotifications.options
            );
            return subscription;
        } catch (error) {
            console.error('Push notification subscription failed:', error);
            return null;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    public async unsubscribeFromPushNotifications(): Promise<boolean> {
        if (!this.registration) return false;

        try {
            const subscription = await this.registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Push notification unsubscribe failed:', error);
            return false;
        }
    }

    /**
     * Check if push notifications are supported and enabled
     */
    public isPushNotificationsSupported(): boolean {
        return (
            'Notification' in window &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            serviceWorkerConfig.pushNotifications.enabled
        );
    }

    /**
     * Request push notification permission
     */
    public async requestNotificationPermission(): Promise<NotificationPermission> {
        if (!this.isPushNotificationsSupported()) {
            throw new Error('Push notifications are not supported');
        }

        return await Notification.requestPermission();
    }
}

export const serviceWorkerManager = ServiceWorkerManager.getInstance(); 