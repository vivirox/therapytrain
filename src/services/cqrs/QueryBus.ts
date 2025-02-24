import { singleton } from '@/lib/decorators';
import { Query, QueryBus, QueryHandler } from '@/types/cqrs';
import { EventEmitter } from 'events';

@singleton()
export class DefaultQueryBus extends EventEmitter implements QueryBus {
  private static instance: DefaultQueryBus;
  private readonly handlers: Map<string, QueryHandler<any, any>>;

  private constructor() {
    super();
    this.handlers = new Map();
  }

  public static getInstance(): DefaultQueryBus {
    if (!DefaultQueryBus.instance) {
      DefaultQueryBus.instance = new DefaultQueryBus();
    }
    return DefaultQueryBus.instance;
  }

  public register<T extends Query, R>(
    queryType: string,
    handler: QueryHandler<T, R>
  ): void {
    if (this.handlers.has(queryType)) {
      throw new Error(`Handler already registered for query type: ${queryType}`);
    }
    this.handlers.set(queryType, handler);
  }

  public async execute<T extends Query, R>(query: T): Promise<R> {
    try {
      // Find handler
      const handler = this.handlers.get(query.type);
      if (!handler) {
        throw new Error(`No handler registered for query type: ${query.type}`);
      }

      // Emit pre-execute event
      this.emit('queryExecuting', query);

      // Execute query
      const result = await handler.handle(query);

      // Emit post-execute event
      this.emit('queryExecuted', { query, result });

      return result;
    } catch (error) {
      // Emit error event
      this.emit('queryError', { query, error });
      throw error;
    }
  }

  public getRegisteredQueryTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  public hasHandler(queryType: string): boolean {
    return this.handlers.has(queryType);
  }

  public clearHandlers(): void {
    this.handlers.clear();
  }
} 