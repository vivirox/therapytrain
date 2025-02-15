import { Redis } from '@upstash/redis';
import { Logger } from '../logger';

interface ConnectionMetadata {
  userId: string;
  threadId: string;
  clientId: string;
  lastActive: number;
  controller?: ReadableStreamDefaultController;
}

type StoredConnectionData = Record<string, string>;

export class ConnectionStore {
  private static instance: ConnectionStore;
  private redis: Redis;
  private logger: Logger;
  private readonly CONNECTIONS_KEY = 'sse:connections';
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly CONNECTION_TIMEOUT = 35000; // 35 seconds (slightly longer than heartbeat)
  private controllers = new Map<string, ReadableStreamDefaultController>();

  private constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    this.logger = Logger.getInstance();
    this.startCleanupInterval();
  }

  public static getInstance(): ConnectionStore {
    if (!ConnectionStore.instance) {
      ConnectionStore.instance = new ConnectionStore();
    }
    return ConnectionStore.instance;
  }

  private startCleanupInterval() {
    setInterval(async () => {
      await this.cleanupStaleConnections();
    }, this.CLEANUP_INTERVAL);
  }

  public async addConnection(metadata: ConnectionMetadata): Promise<void> {
    try {
      const key = `${this.CONNECTIONS_KEY}:${metadata.clientId}`;
      const storedData: StoredConnectionData = {
        userId: metadata.userId,
        threadId: metadata.threadId,
        clientId: metadata.clientId,
        lastActive: Date.now().toString(),
      };

      await this.redis.hset(key, storedData);
      
      if (metadata.controller) {
        this.controllers.set(metadata.clientId, metadata.controller);
      }
      
      await this.logger.info('Connection added', {
        clientId: metadata.clientId,
        userId: metadata.userId,
        threadId: metadata.threadId,
      });
      
      await this.redis.incr('metrics:activeConnections');
    } catch (error) {
      await this.logger.error('Error adding connection', error as Error, {
        clientId: metadata.clientId,
      });
      throw error;
    }
  }

  public async removeConnection(clientId: string): Promise<void> {
    try {
      const key = `${this.CONNECTIONS_KEY}:${clientId}`;
      await this.redis.del(key);
      this.controllers.delete(clientId);
      
      await this.logger.info('Connection removed', { clientId });
      // Track active connections count in Redis
      await this.redis.decr('metrics:activeConnections');
    } catch (error) {
      await this.logger.error('Error removing connection', error as Error, { clientId });
      throw error;
    }
  }

  public async updateLastActive(clientId: string): Promise<void> {
    try {
      const key = `${this.CONNECTIONS_KEY}:${clientId}`;
      await this.redis.hset(key, { lastActive: Date.now().toString() });
    } catch (error) {
      await this.logger.error('Error updating connection last active', error as Error, { clientId });
      throw error;
    }
  }

  public async getConnection(clientId: string): Promise<ConnectionMetadata | null> {
    try {
      const key = `${this.CONNECTIONS_KEY}:${clientId}`;
      const data = await this.redis.hgetall<StoredConnectionData>(key);
      
      if (!data || !data.userId || !data.threadId || !data.clientId || !data.lastActive) {
        return null;
      }
      
      return {
        userId: data.userId,
        threadId: data.threadId,
        clientId: data.clientId,
        lastActive: parseInt(data.lastActive),
        controller: this.controllers.get(clientId),
      };
    } catch (error) {
      await this.logger.error('Error getting connection', error as Error, { clientId });
      throw error;
    }
  }

  public async getActiveConnections(): Promise<string[]> {
    try {
      const pattern = `${this.CONNECTIONS_KEY}:*`;
      return await this.redis.keys(pattern);
    } catch (error) {
      await this.logger.error('Error getting active connections', error as Error);
      throw error;
    }
  }

  private async cleanupStaleConnections(): Promise<void> {
    try {
      const connections = await this.getActiveConnections();
      const now = Date.now();

      for (const connectionKey of connections) {
        const data = await this.redis.hgetall<StoredConnectionData>(connectionKey);
        if (!data || !data.lastActive) continue;

        const lastActive = parseInt(data.lastActive);
        if (now - lastActive > this.CONNECTION_TIMEOUT) {
          const clientId = connectionKey.split(':')[2];
          await this.removeConnection(clientId);
          await this.logger.warn('Stale connection removed', {
            clientId,
            lastActive: new Date(lastActive).toISOString(),
          });
        }
      }
    } catch (error) {
      await this.logger.error('Error cleaning up stale connections', error as Error);
    }
  }

  public async sendEvent(clientId: string, event: any): Promise<void> {
    try {
      const controller = this.controllers.get(clientId);
      if (!controller) {
        throw new Error('Connection not found');
      }

      const message = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));
      await this.updateLastActive(clientId);
    } catch (error) {
      await this.logger.error('Error sending event', error as Error, {
        clientId,
        event,
      });
      await this.removeConnection(clientId);
      throw error;
    }
  }
} 