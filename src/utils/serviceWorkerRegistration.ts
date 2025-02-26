import { serviceWorkerConfig } from '../config/serviceWorker.config';

export class ServiceWorkerManager {
    private registration: ServiceWorkerRegistration | null = null;
    private debug: boolean;

    constructor() {
        this.debug = serviceWorkerConfig.debug.enabled;
    }

    public async register(): Promise<void> {
        if (!serviceWorkerConfig.enabled) {
            return;
        }

        try {
            if ('serviceWorker' in navigator) {
                this.registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: serviceWorkerConfig.scope,
                });

                if (this.debug) {
                    console.log('Service Worker registered successfully');
                }

                await this.setupSync();
                await this.setupPushNotifications();
            }
        } catch (error) {
            this.logError('Service Worker registration failed', error);
        }
    }

    private async setupSync(): Promise<void> {
        if (!this.registration || !serviceWorkerConfig.backgroundSync.enabled) {
            return;
        }

        try {
            const registration = this.registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };
            if ('sync' in registration && registration.sync) {
                await registration.sync.register(serviceWorkerConfig.backgroundSync.queueName);
                if (this.debug) {
                    console.log('Background sync registered successfully');
                }
            }
        } catch (error) {
            this.logError('Background sync registration failed', error);
        }
    }

    private async setupPushNotifications(): Promise<void> {
        if (!this.registration || !serviceWorkerConfig.pushNotifications.enabled) {
            return;
        }

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: serviceWorkerConfig.pushNotifications.options.userVisibleOnly,
                applicationServerKey: serviceWorkerConfig.pushNotifications.publicKey,
            });

            if (this.debug) {
                console.log('Push notification subscription:', subscription);
            }
        } catch (error) {
            this.logError('Push notification registration failed', error);
        }
    }

    public async unregister(): Promise<void> {
        try {
            if (this.registration) {
                await this.registration.unregister();
                if (this.debug) {
                    console.log('Service Worker unregistered successfully');
                }
            }
        } catch (error) {
            this.logError('Service Worker unregistration failed', error);
        }
    }

    public async addToSyncQueue(request: Request): Promise<void> {
        if (!this.registration || !serviceWorkerConfig.backgroundSync.enabled) {
            return;
        }

        try {
            const cache = await caches.open('sync-cache');
            const response = await fetch(request.clone());
            await cache.put(request, response);

            const registration = this.registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };
            if ('sync' in registration && registration.sync) {
                await registration.sync.register(serviceWorkerConfig.backgroundSync.queueName);
            }
        } catch (error) {
            this.logError('Failed to add to sync queue', error);
        }
    }

    private logError(message: string, error: unknown): void {
        if (this.debug) {
            console.error(message, error);
        }
    }
}