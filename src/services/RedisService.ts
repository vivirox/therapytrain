import Redis from 'ioredis';
import { Session } from '../types/session';
import { EventEmitter } from 'events';
import {
    cacheConfig,
    getCacheTTL,
    getCachePattern,
    getPerformanceThreshold,
    isFeatureEnabled,
} from '../config/cache.config';

export class RedisService {
    private static instance: RedisService;
    private client: Redis;
    private eventEmitter: EventEmitter;
    private metrics: {
        hits: number;
        misses: number;
        invalidations: number;
        latency: number[];
    };

    private constructor() {
        // Initialize Redis client with configuration
        this.client = new Redis(process.env.REDIS_URL || '', {
            ...cacheConfig.redis.connection,
            tls: {
                rejectUnauthorized: false
            }
        });

        this.eventEmitter = new EventEmitter();
        this.metrics = {
            hits: 0,
            misses: 0,
            invalidations: 0,
            latency: []
        };

        if (isFeatureEnabled('monitoring')) {
            this.setupMonitoring();
        }

        if (isFeatureEnabled('patternInvalidation')) {
            this.setupPeriodicCleanup();
        }
    }

    private setupMonitoring(): void {
        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
            this.eventEmitter.emit('error', err);
        });

        this.client.on('connect', () => {
            console.log('Redis Client Connected to Upstash');
            this.eventEmitter.emit('connect');
        });

        // Monitor memory usage
        const { interval } = cacheConfig.monitoring.metrics.collection;
        setInterval(async () => {
            try {
                const info = await this.client.info('memory');
                this.eventEmitter.emit('memoryUsage', info);

                // Check memory threshold
                const usedMemory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');
                if (usedMemory > cacheConfig.redis.memory.maxMemoryBytes * cacheConfig.redis.memory.warningThreshold) {
                    this.eventEmitter.emit('memoryWarning', {
                        used: usedMemory,
                        max: cacheConfig.redis.memory.maxMemoryBytes
                    });
                }
            } catch (error) {
                console.error('Failed to get memory usage:', error);
            }
        }, interval);
    }

    private setupPeriodicCleanup(): void {
        // Cleanup expired keys periodically
        setInterval(async () => {
            try {
                const keys = await this.client.keys('*');
                if (keys.length > cacheConfig.redis.cleanup.maxKeys) {
                    console.warn(`Cache key count (${keys.length}) exceeds maximum (${cacheConfig.redis.cleanup.maxKeys})`);
                }

                for (const key of keys) {
                    const ttl = await this.client.ttl(key);
                    if (ttl <= 0) {
                        await this.del(key);
                        this.metrics.invalidations++;
                    }
                }
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        }, cacheConfig.redis.cleanup.interval);
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    /**
     * Set a value in Redis with optional TTL and cache invalidation pattern
     */
    public async set(key: string, value: any, ttl?: number, pattern?: string): Promise<void> {
        const startTime = Date.now();
        try {
            const serializedValue = JSON.stringify(value);
            const effectiveTTL = ttl || getCacheTTL('default');

            await this.client.setex(key, effectiveTTL, serializedValue);

            // If pattern is provided and feature is enabled, add key to pattern set
            if (pattern && isFeatureEnabled('patternInvalidation')) {
                await this.client.sadd(`pattern:${pattern}`, key);
                await this.client.expire(`pattern:${pattern}`, effectiveTTL);
            }

            const latency = Date.now() - startTime;
            this.metrics.latency.push(latency);

            // Check latency threshold
            if (latency > getPerformanceThreshold('maxLatency')) {
                this.eventEmitter.emit('highLatency', { key, latency });
            }

            this.eventEmitter.emit('set', { key, latency });
        } catch (error) {
            console.error('Redis set error:', error);
            this.eventEmitter.emit('error', error);
            throw error;
        }
    }

    /**
     * Get a value from Redis with monitoring
     */
    public async get<T>(key: string): Promise<T | null> {
        const startTime = Date.now();
        try {
            const value = await this.client.get(key);
            const latency = Date.now() - startTime;
            this.metrics.latency.push(latency);

            if (!value) {
                this.metrics.misses++;
                this.eventEmitter.emit('miss', { key, latency });
                return null;
            }

            this.metrics.hits++;
            this.eventEmitter.emit('hit', { key, latency });

            // Check hit rate threshold
            const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses);
            if (hitRate < getPerformanceThreshold('minHitRate')) {
                this.eventEmitter.emit('lowHitRate', { hitRate });
            }

            return JSON.parse(value) as T;
        } catch (error) {
            console.error('Redis get error:', error);
            this.eventEmitter.emit('error', error);
            throw error;
        }
    }

    /**
     * Delete a key from Redis
     */
    public async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error) {
            console.error('Redis del error:', error);
            throw error;
        }
    }

    /**
     * Set multiple values in Redis
     */
    public async mset(keyValues: Record<string, any>, ttl?: number): Promise<void> {
        try {
            const pipeline = this.client.pipeline();
            
            Object.entries(keyValues).forEach(([key, value]) => {
                const serializedValue = JSON.stringify(value);
                if (ttl) {
                    pipeline.setex(key, ttl, serializedValue);
                } else {
                    pipeline.setex(key, getCacheTTL('default'), serializedValue);
                }
            });

            await pipeline.exec();
        } catch (error) {
            console.error('Redis mset error:', error);
            throw error;
        }
    }

    /**
     * Get multiple values from Redis
     */
    public async mget<T>(keys: string[]): Promise<(T | null)[]> {
        try {
            const values = await this.client.mget(keys);
            return values.map(value => value ? JSON.parse(value) as T : null);
        } catch (error) {
            console.error('Redis mget error:', error);
            throw error;
        }
    }

    /**
     * Set session data in Redis
     */
    public async setSession(session: Session): Promise<void> {
        const key = `session:${session.id}`;
        await this.set(key, session, getCacheTTL('session'));
    }

    /**
     * Get session data from Redis
     */
    public async getSession(sessionId: string): Promise<Session | null> {
        const key = `session:${sessionId}`;
        return await this.get<Session>(key);
    }

    /**
     * Delete session data from Redis
     */
    public async deleteSession(sessionId: string): Promise<void> {
        const key = `session:${sessionId}`;
        await this.del(key);
    }

    /**
     * Set a hash field
     */
    public async hset(key: string, field: string, value: any): Promise<void> {
        try {
            const serializedValue = JSON.stringify(value);
            await this.client.hset(key, field, serializedValue);
            await this.client.expire(key, getCacheTTL('default'));
        } catch (error) {
            console.error('Redis hset error:', error);
            throw error;
        }
    }

    /**
     * Get a hash field
     */
    public async hget<T>(key: string, field: string): Promise<T | null> {
        try {
            const value = await this.client.hget(key, field);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            console.error('Redis hget error:', error);
            throw error;
        }
    }

    /**
     * Get all hash fields
     */
    public async hgetall<T>(key: string): Promise<Record<string, T> | null> {
        try {
            const values = await this.client.hgetall(key);
            if (!values) return null;
            
            const result: Record<string, T> = {};
            for (const [field, value] of Object.entries(values)) {
                result[field] = JSON.parse(value) as T;
            }
            return result;
        } catch (error) {
            console.error('Redis hgetall error:', error);
            throw error;
        }
    }

    /**
     * Close Redis connection
     */
    public async close(): Promise<void> {
        await this.client.quit();
    }

    /**
     * Invalidate cache by pattern
     */
    public async invalidateByPattern(pattern: string): Promise<void> {
        if (!isFeatureEnabled('patternInvalidation')) return;

        try {
            const keys = await this.client.smembers(`pattern:${pattern}`);
            if (keys.length > 0) {
                await this.client.del(...keys);
                await this.client.del(`pattern:${pattern}`);
                this.metrics.invalidations += keys.length;

                // Check invalidation rate threshold
                const invalidationRate = this.metrics.invalidations / (this.metrics.hits + this.metrics.misses);
                if (invalidationRate > getPerformanceThreshold('maxInvalidationRate')) {
                    this.eventEmitter.emit('highInvalidationRate', { invalidationRate });
                }

                this.eventEmitter.emit('invalidate', { pattern, count: keys.length });
            }
        } catch (error) {
            console.error('Redis invalidation error:', error);
            this.eventEmitter.emit('error', error);
            throw error;
        }
    }

    /**
     * Get cache metrics with recommendations
     */
    public getMetrics() {
        const avgLatency = this.metrics.latency.length > 0
            ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length
            : 0;

        const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
        const invalidationRate = this.metrics.invalidations / (this.metrics.hits + this.metrics.misses);

        const metrics = {
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hitRate,
            invalidations: this.metrics.invalidations,
            invalidationRate,
            averageLatency: avgLatency,
            totalOperations: this.metrics.hits + this.metrics.misses
        };

        if (isFeatureEnabled('recommendations')) {
            const recommendations = this.generateRecommendations(metrics);
            return { ...metrics, recommendations };
        }

        return metrics;
    }

    private generateRecommendations(metrics: any): string[] {
        const recommendations: string[] = [];

        if (metrics.hitRate < getPerformanceThreshold('minHitRate')) {
            recommendations.push(
                'Consider increasing cache TTL or reviewing cache invalidation strategy'
            );
        }

        if (metrics.averageLatency > getPerformanceThreshold('maxLatency')) {
            recommendations.push(
                'Consider optimizing cache key structure or reviewing network configuration'
            );
        }

        if (metrics.invalidationRate > getPerformanceThreshold('maxInvalidationRate')) {
            recommendations.push(
                'High number of cache invalidations. Review cache patterns and consider using more specific invalidation strategies'
            );
        }

        return recommendations;
    }

    /**
     * Subscribe to cache events
     */
    public onEvent(event: string, callback: (...args: any[]) => void): void {
        this.eventEmitter.on(event, callback);
    }

    /**
     * Reset metrics
     */
    public resetMetrics(): void {
        this.metrics = {
            hits: 0,
            misses: 0,
            invalidations: 0,
            latency: []
        };
    }
} 