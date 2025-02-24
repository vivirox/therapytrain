import { serviceWorkerConfig } from '../config/serviceWorker.config';

type ServiceWorkerStatus = 'installing' | 'installed' | 'activating' | 'activated' | 'redundant';

interface ServiceWorkerRegistrationOptions {
    scope?: string;
    updateViaCache?: ServiceWorkerUpdateViaCache;
}

class ServiceWorkerManager {
    private static instance: ServiceWorkerManager;
    private registration: ServiceWorkerRegistration | null = null;
    private readonly debug: boolean;

    private constructor() {
        this.debug = serviceWorkerConfig.debug.enabled;
        this.log('ServiceWorkerManager initialized');
    }

    public static getInstance(): ServiceWorkerManager {
        if (!ServiceWorkerManager.instance) {
            ServiceWorkerManager.instance = new ServiceWorkerManager();
        }
        return ServiceWorkerManager.instance;
    }

    private log(message: string, ...args: any[]): void {
        if (this.debug) {
            console.log(`[ServiceWorker]`, message, ...args);
        }
    }

    private error(message: string, error?: Error): void {
        console.error(`[ServiceWorker Error]`, message, error);
    }

    public async register(options: ServiceWorkerRegistrationOptions = {}): Promise<void> {
        if (!this.isSupported()) {
            this.error('Service Workers are not supported in this browser');
            return;
        }

        try {
            this.registration = await navigator.serviceWorker.register('/sw.js', {
                scope: options.scope || '/',
                updateViaCache: options.updateViaCache || 'none'
            });

            this.log('Service Worker registered successfully', this.registration);

            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration?.installing;
                if (newWorker) {
                    this.trackInstallation(newWorker);
                }
            });

            if (this.registration.active) {
                this.setupPeriodicSync();
                this.setupPushNotifications();
            }
        } catch (error) {
            this.error('Service Worker registration failed', error as Error);
        }
    }

    private trackInstallation(worker: ServiceWorker): void {
        worker.addEventListener('statechange', () => {
            this.log('Service Worker state changed to:', worker.state);
            
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateNotification();
            }
        });
    }

    private async setupPeriodicSync(): Promise<void> {
        if (!this.registration || !('periodicSync' in this.registration)) {
            return;
        }

        try {
            const status = await navigator.permissions.query({
                name: 'periodic-background-sync' as PermissionName
            });

            if (status.state === 'granted') {
                await (this.registration as any).periodicSync.register('content-sync', {
                    minInterval: serviceWorkerConfig.sync.interval
                });
                this.log('Periodic sync registered');
            }
        } catch (error) {
            this.error('Periodic sync registration failed', error as Error);
        }
    }

    private async setupPushNotifications(): Promise<void> {
        if (!this.registration || !('pushManager' in this.registration)) {
            return;
        }

        try {
            const permission = await this.requestNotificationPermission();
            if (permission === 'granted') {
                const subscription = await this.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: serviceWorkerConfig.push.publicKey
                });
                this.log('Push notification subscription:', subscription);
            }
        } catch (error) {
            this.error('Push notification setup failed', error as Error);
        }
    }

    private async requestNotificationPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            return 'denied';
        }

        try {
            const permission = await Notification.requestPermission();
            this.log('Notification permission:', permission);
            return permission;
        } catch (error) {
            this.error('Notification permission request failed', error as Error);
            return 'denied';
        }
    }

    private showUpdateNotification(): void {
        const event = new CustomEvent('serviceWorkerUpdateAvailable');
        window.dispatchEvent(event);
    }

    public async update(): Promise<void> {
        if (!this.registration) {
            this.error('No Service Worker registration found');
            return;
        }

        try {
            await this.registration.update();
            this.log('Service Worker update check completed');
        } catch (error) {
            this.error('Service Worker update failed', error as Error);
        }
    }

    public async unregister(): Promise<void> {
        if (!this.registration) {
            this.error('No Service Worker registration found');
            return;
        }

        try {
            const success = await this.registration.unregister();
            if (success) {
                this.log('Service Worker unregistered successfully');
                this.registration = null;
            }
        } catch (error) {
            this.error('Service Worker unregistration failed', error as Error);
        }
    }

    public isSupported(): boolean {
        return 'serviceWorker' in navigator && 
               navigator.serviceWorker !== undefined;
    }

    public getRegistration(): ServiceWorkerRegistration | null {
        return this.registration;
    }

    public async addToSyncQueue(request: Request): Promise<void> {
        if (!this.registration || !('sync' in this.registration)) {
            this.error('Background Sync is not supported');
            return;
        }

        try {
            await (this.registration as any).sync.register('sync-request');
            this.log('Request added to sync queue');
        } catch (error) {
            this.error('Failed to add request to sync queue', error as Error);
        }
    }
}

export const serviceWorkerManager = ServiceWorkerManager.getInstance(); 