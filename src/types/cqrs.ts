import { z } from 'zod';

// Base interfaces for commands and events
export interface Command {
  id: string;
  type: string;
  timestamp: Date;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

export interface Event {
  id: string;
  type: string;
  timestamp: Date;
  payload: unknown;
  metadata?: Record<string, unknown>;
  commandId?: string;
  version: number;
}

// Event store interfaces
export interface EventStore {
  append(event: Event): Promise<void>;
  getEvents(aggregateId: string): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
  getEventsByType(type: string): Promise<Event[]>;
}

// Command handler interfaces
export interface CommandHandler<T extends Command = Command> {
  handle(command: T): Promise<Event[]>;
}

export interface CommandBus {
  dispatch<T extends Command>(command: T): Promise<Event[]>;
  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void;
}

// Event handler interfaces
export interface EventHandler<T extends Event = Event> {
  handle(event: T): Promise<void>;
}

export interface EventBus {
  publish(event: Event): Promise<void>;
  subscribe<T extends Event>(
    eventType: string,
    handler: EventHandler<T>
  ): void;
}

// Query interfaces
export interface Query<T = unknown> {
  type: string;
  parameters?: Record<string, unknown>;
}

export interface QueryHandler<T extends Query, R = unknown> {
  handle(query: T): Promise<R>;
}

export interface QueryBus {
  execute<T extends Query, R>(query: T): Promise<R>;
  register<T extends Query, R>(
    queryType: string,
    handler: QueryHandler<T, R>
  ): void;
}

// Aggregate root interface
export interface AggregateRoot {
  id: string;
  version: number;
  uncommittedEvents: Event[];
  apply(event: Event): void;
  commit(): void;
}

// Event store options
export interface EventStoreOptions {
  snapshotFrequency?: number;
  eventTTL?: number;
  maxEventsPerAggregate?: number;
}

// Command validation schema
export const commandSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.date(),
  payload: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Event validation schema
export const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.date(),
  payload: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  commandId: z.string().optional(),
  version: z.number()
}); 