import { Gauge, Counter, Histogram } from 'prom-client';

// Request metrics
export const httpRequestDurationMicroseconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
});

// System metrics
export const systemMemoryUsage = new Gauge({
  name: 'system_memory_usage_bytes',
  help: 'System memory usage in bytes',
});

export const systemCpuUsage = new Gauge({
  name: 'system_cpu_usage_percent',
  help: 'System CPU usage percentage',
});

// Application metrics
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active WebSocket connections',
});

export const messageProcessingTime = new Histogram({
  name: 'message_processing_time_seconds',
  help: 'Time taken to process messages',
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Database metrics
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const databaseConnectionPool = new Gauge({
  name: 'database_connection_pool_size',
  help: 'Size of the database connection pool',
});

// Cache metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache'],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache'],
});

// Error metrics
export const errorCount = new Counter({
  name: 'error_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
});

// Business metrics
export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

export const transactionCount = new Counter({
  name: 'transaction_total',
  help: 'Total number of transactions',
  labelNames: ['type', 'status'],
});

export class MetricsService {
  incrementCounter(name: string, labels: Record<string, string> = {}) {
    switch (name) {
      case 'http_requests':
        httpRequestsTotal.inc(labels);
        break;
      case 'cache_hits':
        cacheHits.inc(labels);
        break;
      case 'cache_misses':
        cacheMisses.inc(labels);
        break;
      case 'errors':
        errorCount.inc(labels);
        break;
      case 'transactions':
        transactionCount.inc(labels);
        break;
    }
  }

  timing(name: string, duration: number, labels: Record<string, string> = {}) {
    switch (name) {
      case 'http_request_duration':
        httpRequestDurationMicroseconds.observe(labels, duration);
        break;
      case 'message_processing':
        messageProcessingTime.observe(duration);
        break;
      case 'database_query':
        databaseQueryDuration.observe(labels, duration);
        break;
    }
  }

  setGauge(name: string, value: number) {
    switch (name) {
      case 'system_memory':
        systemMemoryUsage.set(value);
        break;
      case 'system_cpu':
        systemCpuUsage.set(value);
        break;
      case 'active_connections':
        activeConnections.set(value);
        break;
      case 'db_pool_size':
        databaseConnectionPool.set(value);
        break;
      case 'active_users':
        activeUsers.set(value);
        break;
    }
  }
}