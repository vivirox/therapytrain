import { Redis } from "@upstash/redis";
import { cacheConfig } from "@/config/cache.config";
import { env } from "@/utils/env";
import { MetricsService } from "./metrics";

interface LogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  userId?: string;
  threadId?: string;
  error?: Error;
}

type MetricKey =
  | "totalRequests"
  | "totalErrors"
  | "activeConnections"
  | "averageResponseTime";

interface LogMetrics extends Record<string, unknown> {
  totalRequests: number;
  totalErrors: number;
  activeConnections: number;
  averageResponseTime: number;
}

export class Logger {
  private static instance: Logger;
  private redis: Redis;
  private metricsKey = "chat:metrics";
  private logsKey = "chat:logs";
  private context: string;
  private metrics: MetricsService;

  private constructor(context: string) {
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    this.context = context;
    this.metrics = new MetricsService();
  }

  public static getInstance(context: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(context);
    }
    return Logger.instance;
  }

  /**
   * Log an event with context
   */
  async log(entry: Omit<LogEntry, "timestamp">) {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console[entry.level](entry.message, {
        context: entry.context,
        userId: entry.userId,
        threadId: entry.threadId,
        error: entry.error,
      });
    }

    // Store in Redis with TTL
    await this.redis.lpush(this.logsKey, JSON.stringify(logEntry));
    await this.redis.ltrim(this.logsKey, 0, 999); // Keep last 1000 logs
    await this.redis.expire(this.logsKey, cacheConfig.redis.ttl.messages);

    // Update metrics
    if (entry.level === "error") {
      await this.incrementMetric("totalErrors");
    }
  }

  /**
   * Log info level message
   */
  async info(message: string, data?: Record<string, any>) {
    console.log(`[${this.context}] INFO:`, message, data || "");
    await this.log({ level: "info", message, context: data });
  }

  /**
   * Log warning level message
   */
  async warn(message: string, data?: Record<string, any>) {
    console.warn(`[${this.context}] WARN:`, message, data || "");
    await this.log({ level: "warn", message, context: data });
  }

  /**
   * Log error level message
   */
  async error(message: string, error?: Error, data?: Record<string, any>) {
    console.error(
      `[${this.context}] ERROR:`,
      message,
      error?.message || "",
      data || "",
    );
    this.metrics.incrementCounter("errors", { type: error?.name || "unknown" });
    await this.log({ level: "error", message, error, context: data });
  }

  /**
   * Log debug level message
   */
  async debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === "development") {
      await this.log({ level: "debug", message, context });
    }
  }

  /**
   * Track request metrics
   */
  async trackRequest(duration: number) {
    this.metrics.timing("http_request_duration", duration, {
      context: this.context,
    });
    await this.incrementMetric("totalRequests");
    await this.updateAverageResponseTime(duration);
  }

  /**
   * Track SSE connection
   */
  async trackConnection(active: boolean) {
    if (active) {
      await this.incrementMetric("activeConnections");
    } else {
      await this.decrementMetric("activeConnections");
    }
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<LogMetrics> {
    const metrics = await this.redis.hgetall<LogMetrics>(this.metricsKey);
    return {
      totalRequests: Number(metrics?.totalRequests || 0),
      totalErrors: Number(metrics?.totalErrors || 0),
      activeConnections: Number(metrics?.activeConnections || 0),
      averageResponseTime: Number(metrics?.averageResponseTime || 0),
    };
  }

  /**
   * Get recent logs
   */
  async getLogs(limit: number = 100): Promise<LogEntry[]> {
    const logs = await this.redis.lrange(this.logsKey, 0, limit - 1);
    return logs.map((log) => JSON.parse(log));
  }

  /**
   * Clear all logs and metrics
   */
  async clear() {
    await this.redis.del(this.logsKey, this.metricsKey);
  }

  private async incrementMetric(key: MetricKey) {
    await this.redis.hincrby(this.metricsKey, key, 1);
  }

  private async decrementMetric(key: MetricKey) {
    await this.redis.hincrby(this.metricsKey, key, -1);
  }

  private async updateAverageResponseTime(duration: number) {
    const metrics = await this.getMetrics();
    const totalRequests = metrics.totalRequests + 1;
    const newAverage =
      (metrics.averageResponseTime * metrics.totalRequests + duration) /
      totalRequests;

    await this.redis.hset(this.metricsKey, {
      averageResponseTime: newAverage,
    });
  }
}

export const logger = Logger.getInstance("default");
