import { singleton } from '@/lib/decorators';
import { Event, EventStore, EventStoreOptions } from '@/types/cqrs';
import { RedisService } from '@/services/RedisService';
import { eventSchema } from '@/types/cqrs';
import { EventEmitter } from 'events';

@singleton()
export class RedisEventStore extends EventEmitter implements EventStore {
  private static instance: RedisEventStore;
  private readonly redisService: RedisService;
  private readonly options: EventStoreOptions;

  constructor(options: EventStoreOptions = {}) {
    super();
    this.redisService = RedisService.getInstance();
    this.options = {
      snapshotFrequency: 100,
      eventTTL: 365 * 24 * 60 * 60, // 1 year in seconds
      maxEventsPerAggregate: 1000,
      ...options
    };
  }

  public static getInstance(options?: EventStoreOptions): RedisEventStore {
    if (!RedisEventStore.instance) {
      RedisEventStore.instance = new RedisEventStore(options);
    }
    return RedisEventStore.instance;
  }

  private getEventKey(eventId: string): string {
    return `event:${eventId}`;
  }

  private getAggregateKey(aggregateId: string): string {
    return `aggregate:${aggregateId}:events`;
  }

  private getEventTypeKey(type: string): string {
    return `eventType:${type}:events`;
  }

  public async append(event: Event): Promise<void> {
    try {
      // Validate event
      eventSchema.parse(event);

      // Store event
      const eventKey = this.getEventKey(event.id);
      await this.redisService.set(eventKey, event, this.options.eventTTL);

      // Add to aggregate's event list
      if (event.metadata?.aggregateId) {
        const aggregateKey = this.getAggregateKey(event.metadata.aggregateId as string);
        await this.redisService.rpush(aggregateKey, event.id);

        // Check if we need to create a snapshot
        const eventCount = await this.redisService.llen(aggregateKey);
        if (eventCount % this.options.snapshotFrequency === 0) {
          await this.createSnapshot(event.metadata.aggregateId as string);
        }

        // Enforce max events per aggregate
        if (eventCount > this.options.maxEventsPerAggregate) {
          const excessEvents = eventCount - this.options.maxEventsPerAggregate;
          await this.redisService.ltrim(aggregateKey, excessEvents, -1);
        }
      }

      // Add to event type index
      await this.redisService.rpush(this.getEventTypeKey(event.type), event.id);

      // Emit event
      this.emit('eventStored', event);
    } catch (error) {
      console.error('Error storing event:', error);
      throw error;
    }
  }

  public async getEvents(aggregateId: string): Promise<Event[]> {
    const aggregateKey = this.getAggregateKey(aggregateId);
    const eventIds = await this.redisService.lrange(aggregateKey, 0, -1);
    
    const events: Event[] = [];
    for (const eventId of eventIds) {
      const event = await this.redisService.get(this.getEventKey(eventId));
      if (event) {
        events.push(event as Event);
      }
    }

    return events.sort((a, b) => a.version - b.version);
  }

  public async getAllEvents(): Promise<Event[]> {
    const eventKeys = await this.redisService.keys('event:*');
    const events: Event[] = [];

    for (const key of eventKeys) {
      const event = await this.redisService.get(key);
      if (event) {
        events.push(event as Event);
      }
    }

    return events.sort((a, b) => a.version - b.version);
  }

  public async getEventsByType(type: string): Promise<Event[]> {
    const typeKey = this.getEventTypeKey(type);
    const eventIds = await this.redisService.lrange(typeKey, 0, -1);
    
    const events: Event[] = [];
    for (const eventId of eventIds) {
      const event = await this.redisService.get(this.getEventKey(eventId));
      if (event) {
        events.push(event as Event);
      }
    }

    return events.sort((a, b) => a.version - b.version);
  }

  private async createSnapshot(aggregateId: string): Promise<void> {
    // Get all events for the aggregate
    const events = await this.getEvents(aggregateId);
    
    // Create snapshot (implementation depends on your needs)
    const snapshot = {
      aggregateId,
      version: events[events.length - 1].version,
      timestamp: new Date(),
      state: events // Or compute aggregate state from events
    };

    // Store snapshot
    await this.redisService.set(
      `snapshot:${aggregateId}`,
      snapshot,
      this.options.eventTTL
    );
  }
} 