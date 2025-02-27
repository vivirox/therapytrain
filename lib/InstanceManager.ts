/**
 * Instance Manager for handling load balancing and instance discovery
 */

interface Instance {
  instanceId: string;
  host: string;
  port: number;
  connections: number;
  lastHealthCheck: number;
  isHealthy: boolean;
  region?: string;
}

export class InstanceManager {
  private instances: Map<string, Instance> = new Map();
  public readonly instanceId: string;
  private readonly HOST: string;
  private readonly PORT: number;
  
  constructor() {
    // Generate a unique ID for this instance
    this.instanceId = `instance-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Get host and port from environment or use defaults
    this.HOST = process.env.HOST || 'localhost';
    this.PORT = parseInt(process.env.PORT || '3000', 10);
    
    // Register this instance
    this.registerInstance();
  }
  
  /**
   * Register this instance in the pool
   */
  private registerInstance(): void {
    this.instances.set(this.instanceId, {
      instanceId: this.instanceId,
      host: this.HOST,
      port: this.PORT,
      connections: 0,
      lastHealthCheck: Date.now(),
      isHealthy: true
    });
  }
  
  /**
   * Select the best instance to handle a new connection
   */
  async selectInstanceForConnection(userId: string): Promise<Instance | null> {
    // Filter for healthy instances
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.isHealthy);
    
    if (healthyInstances.length === 0) {
      return null;
    }
    
    // Simple load balancing - select instance with fewest connections
    let selectedInstance = healthyInstances.reduce((prev, current) => 
      prev.connections <= current.connections ? prev : current
    );
    
    // Update connection count
    selectedInstance.connections++;
    this.instances.set(selectedInstance.instanceId, selectedInstance);
    
    return selectedInstance;
  }
  
  /**
   * Register a client disconnection
   */
  async registerDisconnection(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.connections = Math.max(0, instance.connections - 1);
      this.instances.set(instanceId, instance);
    }
  }
  
  /**
   * Update health status of this instance
   */
  async updateHealth(isHealthy: boolean): Promise<void> {
    const instance = this.instances.get(this.instanceId);
    if (instance) {
      instance.isHealthy = isHealthy;
      instance.lastHealthCheck = Date.now();
      this.instances.set(this.instanceId, instance);
    }
  }
  
  /**
   * Get total number of active connections across all instances
   */
  getTotalConnections(): number {
    return Array.from(this.instances.values())
      .reduce((total, instance) => total + instance.connections, 0);
  }
  
  /**
   * Get all registered instances
   */
  getAllInstances(): Instance[] {
    return Array.from(this.instances.values());
  }
}