import { singleton } from '@/lib/decorators';
import { Command, CommandBus, CommandHandler, Event } from '@/types/cqrs';
import { commandSchema } from '@/types/cqrs';
import { EventEmitter } from 'events';

@singleton()
export class DefaultCommandBus extends EventEmitter implements CommandBus {
  private static instance: DefaultCommandBus;
  private readonly handlers: Map<string, CommandHandler>;

  private constructor() {
    super();
    this.handlers = new Map();
  }

  public static getInstance(): DefaultCommandBus {
    if (!DefaultCommandBus.instance) {
      DefaultCommandBus.instance = new DefaultCommandBus();
    }
    return DefaultCommandBus.instance;
  }

  public register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler already registered for command type: ${commandType}`);
    }
    this.handlers.set(commandType, handler);
  }

  public async dispatch<T extends Command>(command: T): Promise<Event[]> {
    try {
      // Validate command
      commandSchema.parse(command);

      // Find handler
      const handler = this.handlers.get(command.type);
      if (!handler) {
        throw new Error(`No handler registered for command type: ${command.type}`);
      }

      // Emit pre-dispatch event
      this.emit('commandDispatching', command);

      // Handle command
      const events = await handler.handle(command);

      // Emit post-dispatch event
      this.emit('commandDispatched', { command, events });

      return events;
    } catch (error) {
      // Emit error event
      this.emit('commandError', { command, error });
      throw error;
    }
  }

  public getRegisteredCommandTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  public hasHandler(commandType: string): boolean {
    return this.handlers.has(commandType);
  }

  public clearHandlers(): void {
    this.handlers.clear();
  }
} 