import { singleton } from '@/lib/decorators';
import { Event, EventBus, EventHandler } from '@/types/cqrs';
import { eventSchema } from '@/types/cqrs';
import { EventEmitter } from 'events';
import { RedisEventStore } from './EventStore';

@singleton()
export class DefaultEventBus extends EventEmitter implements EventBus {
  private static instance: DefaultEventBus;
  private readonly handlers: Map<string, Set<EventHandler>>;
  private readonly eventStore: RedisEventStore;

  private constructor() {
    super();
    this.handlers = new Map();
    this.eventStore = RedisEventStore.getInstance();
  }

  public static getInstance(): DefaultEventBus {
    if (!DefaultEventBus.instance) {
      DefaultEventBus.instance = new DefaultEventBus();
    }
    return DefaultEventBus.instance;
  }

  public subscribe<T extends Event>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  public unsubscribe<T extends Event>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  public async publish(event: Event): Promise<void> {
    try {
      // Validate event
      eventSchema.parse(event);

      // Store event
      await this.eventStore.append(event);

      // Emit pre-publish event
      this.emit('eventPublishing', event);

      // Get handlers
      const handlers = this.handlers.get(event.type) || new Set();

      // Handle event
      const promises = Array.from(handlers).map(handler =>
        handler.handle(event).catch(error => {
          console.error(`Error handling event ${event.type}:`, error);
          this.emit('eventHandlerError', { event, handler, error });
        })
      );

      // Wait for all handlers to complete
      await Promise.all(promises);

      // Emit post-publish event
      this.emit('eventPublished', event);
    } catch (error) {
      // Emit error event
      this.emit('eventError', { event, error });
      throw error;
    }
  }

  public getSubscribedEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  public getHandlers(eventType: string): EventHandler[] {
    return Array.from(this.handlers.get(eventType) || []);
  }

  public hasHandlers(eventType: string): boolean {
    const handlers = this.handlers.get(eventType);
    return handlers !== undefined && handlers.size > 0;
  }

  public clearHandlers(): void {
    this.handlers.clear();
  }
} 