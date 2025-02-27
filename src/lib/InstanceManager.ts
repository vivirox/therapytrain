interface Instance {
  instanceId: string;
  host: string;
  port: number;
  status: 'healthy' | 'unhealthy';
  lastHealthCheck: number;
  activeConnections: number;
}

export class InstanceManager {
  private instances: Map<string, Instance> = new Map();
  public readonly instanceId: string;

  constructor() {
    this.instanceId = `instance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.instances.set(this.instanceId, {
      instanceId: this.instanceId,
      host: process.env.HOST || 'localhost',
      port: parseInt(process.env.PORT || '3000'),
      status: 'healthy',
      lastHealthCheck: Date.now(),
      activeConnections: 0,
    });
  }

  async selectInstanceForConnection(userId: string): Promise<Instance | null> {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');

    if (healthyInstances.length === 0) {
      return null;
    }

    // Simple round-robin selection based on connection count
    const selectedInstance = healthyInstances.reduce((prev, curr) => 
      prev.activeConnections <= curr.activeConnections ? prev : curr
    );

    selectedInstance.activeConnections++;
    return selectedInstance;
  }

  async registerInstance(host: string, port: number): Promise<void> {
    const instanceId = `instance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.instances.set(instanceId, {
      instanceId,
      host,
      port,
      status: 'healthy',
      lastHealthCheck: Date.now(),
      activeConnections: 0,
    });
  }

  async updateInstanceHealth(instanceId: string, status: 'healthy' | 'unhealthy'): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = status;
      instance.lastHealthCheck = Date.now();
    }
  }

  async removeInstance(instanceId: string): Promise<void> {
    this.instances.delete(instanceId);
  }
} 