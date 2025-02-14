import { Redis } from '@upstash/redis';
import { Logger } from '../logger';

interface InstanceMetadata {
  instanceId: string;
  host: string;
  port: number;
  region: string;
  status: 'active' | 'draining' | 'inactive';
  lastHeartbeat: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
}

type StoredInstanceData = Record<string, string | number>;

export class InstanceManager {
  private static instance: InstanceManager;
  private redis: Redis;
  private logger: Logger;
  private readonly INSTANCES_KEY = 'instances';
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly INSTANCE_TIMEOUT = 90000; // 90 seconds
  private readonly instanceId: string;
  private heartbeatInterval?: NodeJS.Timeout;

  private constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    this.logger = Logger.getInstance();
    this.instanceId = `${process.env.VERCEL_REGION || 'local'}-${Date.now()}`;
  }

  public static getInstance(): InstanceManager {
    if (!InstanceManager.instance) {
      InstanceManager.instance = new InstanceManager();
    }
    return InstanceManager.instance;
  }

  public async registerInstance(): Promise<void> {
    try {
      const metadata: InstanceMetadata = {
        instanceId: this.instanceId,
        host: process.env.VERCEL_URL || 'localhost',
        port: parseInt(process.env.PORT || '3000'),
        region: process.env.VERCEL_REGION || 'local',
        status: 'active',
        lastHeartbeat: Date.now(),
        activeConnections: 0,
        cpuUsage: 0,
        memoryUsage: 0,
      };

      const storedData: StoredInstanceData = {
        ...metadata,
        lastHeartbeat: metadata.lastHeartbeat.toString(),
        port: metadata.port.toString(),
        activeConnections: metadata.activeConnections.toString(),
        cpuUsage: metadata.cpuUsage.toString(),
        memoryUsage: metadata.memoryUsage.toString(),
      };

      await this.redis.hset(`${this.INSTANCES_KEY}:${this.instanceId}`, storedData);
      await this.logger.info('Instance registered', { instanceId: this.instanceId });

      this.startHeartbeat();
    } catch (error) {
      await this.logger.error('Error registering instance', error as Error);
      throw error;
    }
  }

  public async deregisterInstance(): Promise<void> {
    try {
      await this.redis.del(`${this.INSTANCES_KEY}:${this.instanceId}`);
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      await this.logger.info('Instance deregistered', { instanceId: this.instanceId });
    } catch (error) {
      await this.logger.error('Error deregistering instance', error as Error);
      throw error;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const metrics = await this.getInstanceMetrics();
        await this.updateInstanceMetadata({
          lastHeartbeat: Date.now(),
          ...metrics,
        });
      } catch (error) {
        await this.logger.error('Error updating instance heartbeat', error as Error);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private async getInstanceMetrics(): Promise<Partial<InstanceMetadata>> {
    // In a real implementation, we would get these metrics from the system
    // For now, we'll return dummy values
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      activeConnections: await this.getActiveConnectionCount(),
    };
  }

  private async getActiveConnectionCount(): Promise<number> {
    try {
      const count = await this.redis.get<number>('metrics:activeConnections');
      return count || 0;
    } catch (error) {
      await this.logger.error('Error getting active connection count', error as Error);
      return 0;
    }
  }

  private async updateInstanceMetadata(update: Partial<InstanceMetadata>): Promise<void> {
    try {
      const storedData: StoredInstanceData = Object.entries(update).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value?.toString() || '',
        }),
        {}
      );

      await this.redis.hset(`${this.INSTANCES_KEY}:${this.instanceId}`, storedData);
    } catch (error) {
      await this.logger.error('Error updating instance metadata', error as Error);
      throw error;
    }
  }

  public async getHealthyInstances(): Promise<InstanceMetadata[]> {
    try {
      const instances = await this.redis.keys(`${this.INSTANCES_KEY}:*`);
      const now = Date.now();
      const healthyInstances: InstanceMetadata[] = [];

      for (const instanceKey of instances) {
        const data = await this.redis.hgetall<StoredInstanceData>(instanceKey);
        if (!data) continue;

        const instance: InstanceMetadata = {
          instanceId: data.instanceId as string,
          host: data.host as string,
          port: parseInt(data.port as string),
          region: data.region as string,
          status: data.status as 'active' | 'draining' | 'inactive',
          lastHeartbeat: parseInt(data.lastHeartbeat as string),
          activeConnections: parseInt(data.activeConnections as string),
          cpuUsage: parseFloat(data.cpuUsage as string),
          memoryUsage: parseFloat(data.memoryUsage as string),
        };

        if (
          instance.status === 'active' &&
          now - instance.lastHeartbeat < this.INSTANCE_TIMEOUT
        ) {
          healthyInstances.push(instance);
        } else if (now - instance.lastHeartbeat >= this.INSTANCE_TIMEOUT) {
          await this.redis.del(instanceKey);
          await this.logger.warn('Removed stale instance', {
            instanceId: instance.instanceId,
            lastHeartbeat: new Date(instance.lastHeartbeat).toISOString(),
          });
        }
      }

      return healthyInstances;
    } catch (error) {
      await this.logger.error('Error getting healthy instances', error as Error);
      throw error;
    }
  }

  public async selectInstanceForConnection(userId: string): Promise<InstanceMetadata | null> {
    try {
      const healthyInstances = await this.getHealthyInstances();
      if (healthyInstances.length === 0) {
        return null;
      }

      // First, try to find an instance in the same region
      const userRegion = await this.getUserRegion(userId);
      const sameRegionInstances = healthyInstances.filter(
        instance => instance.region === userRegion
      );

      const candidateInstances = sameRegionInstances.length > 0 
        ? sameRegionInstances 
        : healthyInstances;

      // Select instance with lowest load (weighted by active connections and resource usage)
      return candidateInstances.reduce((best, current) => {
        const currentLoad = this.calculateInstanceLoad(current);
        const bestLoad = this.calculateInstanceLoad(best);
        return currentLoad < bestLoad ? current : best;
      });
    } catch (error) {
      await this.logger.error('Error selecting instance', error as Error);
      throw error;
    }
  }

  private calculateInstanceLoad(instance: InstanceMetadata): number {
    // Weight different factors to calculate overall load
    const connectionWeight = 0.4;
    const cpuWeight = 0.3;
    const memoryWeight = 0.3;

    return (
      (instance.activeConnections * connectionWeight) +
      (instance.cpuUsage * cpuWeight) +
      (instance.memoryUsage * memoryWeight)
    );
  }

  private async getUserRegion(userId: string): Promise<string> {
    try {
      const region = await this.redis.get<string>(`user:${userId}:region`);
      return region || 'unknown';
    } catch (error) {
      await this.logger.error('Error getting user region', error as Error);
      return 'unknown';
    }
  }

  public async drainInstance(): Promise<void> {
    try {
      await this.updateInstanceMetadata({ status: 'draining' });
      await this.logger.info('Instance draining started', { instanceId: this.instanceId });
    } catch (error) {
      await this.logger.error('Error starting instance drain', error as Error);
      throw error;
    }
  }
} 