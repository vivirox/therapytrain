import { serviceWorkerConfig } from "../config/serviceWorker.config";

export class ServiceWorker {
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
      if ("serviceWorker" in navigator) {
        if (
          serviceWorkerConfig.registration.strategy === "registerWhenStable"
        ) {
          if ("serviceWorker" in navigator) {
            window.addEventListener("load", async () => {
              await this.registerServiceWorker();
            });
          }
        } else {
          await this.registerServiceWorker();
        }
      }
    } catch (error) {
      this.logError("Failed to register service worker", error);
    }
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register("/sw.js", {
        scope: serviceWorkerConfig.scope,
      });

      if (this.debug) {
        console.log("Service Worker registered successfully");
      }

      if (
        serviceWorkerConfig.backgroundSync.enabled &&
        "sync" in this.registration &&
        this.registration !== null &&
        "sync" in this.registration
      ) {
        const registration = this.registration as ServiceWorkerRegistration & {
          sync: { register(tag: string): Promise<void> };
        };
        await registration.sync.register(
          serviceWorkerConfig.backgroundSync.queueName,
        );
        if (this.debug) {
          console.log("Background sync registered successfully");
        }
      }

      if (serviceWorkerConfig.pushNotifications.enabled) {
        await this.registerPushNotifications();
      }
    } catch (error) {
      this.logError("Service Worker registration failed", error);
    }
  }

  private async registerPushNotifications(): Promise<void> {
    try {
      const subscription = await this.registration?.pushManager.subscribe({
        userVisibleOnly:
          serviceWorkerConfig.pushNotifications.options.userVisibleOnly,
        applicationServerKey: serviceWorkerConfig.pushNotifications.publicKey,
      });

      if (this.debug) {
        console.log("Push notification subscription:", subscription);
      }
    } catch (error) {
      this.logError("Push notification registration failed", error);
    }
  }

  public async unregister(): Promise<void> {
    try {
      if (this.registration) {
        await this.registration.unregister();
        if (this.debug) {
          console.log("Service Worker unregistered successfully");
        }
      }
    } catch (error) {
      this.logError("Service Worker unregistration failed", error);
    }
  }

  public async addToCache(request: Request): Promise<void> {
    try {
      const cache = await caches.open("app-cache");
      const response = await fetch(request.clone());
      await cache.put(request, response);

      if (
        serviceWorkerConfig.backgroundSync.enabled &&
        this.registration &&
        "sync" in this.registration
      ) {
        const registration = this.registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        };
        await registration.sync.register(
          serviceWorkerConfig.backgroundSync.queueName,
        );
      }
    } catch (error) {
      this.logError("Failed to add to cache", error);
    }
  }

  private logError(message: string, error: unknown): void {
    if (this.debug) {
      console.error(message, error);
    }
  }
}
