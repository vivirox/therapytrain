import { vi } from 'vitest';
import { EventEmitter } from 'events';

export const redisMock = {
  store: new Map<string, { value: any; expiry?: number }>(),
  patterns: new Map<string, Set<string>>(),
  eventEmitter: new EventEmitter(),
  memoryUsage: 0,
  memoryLimit: 100 * 1024 * 1024, // 100MB limit for testing
  metrics: {
    hits: 0,
    misses: 0,
    latencySum: 0,
    operationCount: 0,
    recommendations: [] as string[]
  },

  onEvent(event: string, callback: (...args: any[]) => void) {
    this.eventEmitter.on(event, callback);
  },

  async set(key: string, value: any, ttl?: number, pattern?: string) {
    const startTime = Date.now();
    
    // Simulate some latency
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Calculate memory usage (rough estimation)
    const valueSize = JSON.stringify(value).length;
    if (this.memoryUsage + valueSize > this.memoryLimit) {
      this.eventEmitter.emit('memoryWarning', {
        currentUsage: this.memoryUsage,
        limit: this.memoryLimit
      });
      throw new Error('Memory limit exceeded');
    }
    
    this.memoryUsage += valueSize;
    this.store.set(key, { 
      value, 
      expiry: ttl ? Date.now() + ttl * 1000 : undefined 
    });
    
    if (pattern) {
      if (!this.patterns.has(pattern)) {
        this.patterns.set(pattern, new Set());
      }
      this.patterns.get(pattern)?.add(key);
    }
    
    this.trackLatency(startTime);
    this.checkMetrics();
  },

  async get(key: string) {
    const startTime = Date.now();
    
    // Simulate some latency
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const entry = this.store.get(key);
    
    if (!entry || (entry.expiry && entry.expiry < Date.now())) {
      this.metrics.misses++;
      this.trackLatency(startTime);
      this.checkMetrics();
      return null;
    }
    
    this.metrics.hits++;
    this.trackLatency(startTime);
    this.checkMetrics();
    return entry.value;
  },

  async del(key: string) {
    const startTime = Date.now();
    // Simulate some latency
    await new Promise(resolve => setTimeout(resolve, 3));
    this.store.delete(key);
    this.trackLatency(startTime);
  },

  getMetrics() {
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0,
      averageLatency: this.metrics.operationCount > 0 ? this.metrics.latencySum / this.metrics.operationCount : 0,
      recommendations: this.metrics.recommendations
    };
  },

  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      latencySum: 0,
      operationCount: 0,
      recommendations: []
    };
    this.memoryUsage = 0;
    this.eventEmitter.removeAllListeners();
  },

  trackLatency(startTime: number) {
    const latency = Date.now() - startTime;
    this.metrics.latencySum += latency;
    this.metrics.operationCount++;
  },

  checkMetrics() {
    const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
    const averageLatency = this.metrics.operationCount > 0 ? this.metrics.latencySum / this.metrics.operationCount : 0;

    // Clear old recommendations
    this.metrics.recommendations = [];

    // Check hit rate
    if (hitRate < 0.5 && (this.metrics.hits + this.metrics.misses) > 5) {
      this.metrics.recommendations.push('Low cache hit rate detected, consider reviewing cache strategy');
    }

    // Check latency
    if (averageLatency > 50) {
      this.metrics.recommendations.push('High latency detected, consider optimizing cache strategy');
    }
  },

  async invalidateByPattern(pattern: string) {
    const startTime = Date.now();
    // Simulate some latency
    await new Promise(resolve => setTimeout(resolve, 5));
    const keys = this.patterns.get(pattern);
    if (keys) {
      for (const key of keys) {
        await this.del(key);
      }
      this.patterns.delete(pattern);
    }
    this.trackLatency(startTime);
  }
};

export const resetRedisMock = () => {
  redisMock.store.clear();
  redisMock.patterns.clear();
  redisMock.resetMetrics();
}; 