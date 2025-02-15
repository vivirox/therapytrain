import { RedisService } from './RedisService';
import { MonitoringService } from './MonitoringService';
import { EventEmitter } from 'events';
import {
    cacheConfig,
    getCacheTTL,
    getCachePattern,
    getPerformanceThreshold,
} from '../config/cache.config';

interface CachePattern {
    key: string;
    accessCount: number;
    lastAccess: number;
    avgInterval: number;
    predictedNextAccess: number;
}

interface CacheAnalytics {
    patterns: Map<string, CachePattern>;
    hotKeys: Set<string>;
    coldKeys: Set<string>;
    accessHistory: Map<string, number[]>;
}

export class SmartCacheService extends EventEmitter {
    private static instance: SmartCacheService;
    private redisService: RedisService;
    private monitoringService: MonitoringService;
    private analytics: CacheAnalytics;
    private warmerInterval: NodeJS.Timeout | null = null;
    private readonly PATTERN_THRESHOLD = 5; // Minimum accesses to establish a pattern
    private readonly WARM_INTERVAL = 60000; // 1 minute
    private readonly MAX_HISTORY = 100; // Maximum number of access timestamps to keep

    private constructor() {
        super();
        this.redisService = RedisService.getInstance();
        this.monitoringService = MonitoringService.getInstance();
        this.analytics = {
            patterns: new Map(),
            hotKeys: new Set(),
            coldKeys: new Set(),
            accessHistory: new Map(),
        };

        this.setupEventListeners();
        this.startCacheWarmer();
    }

    public static getInstance(): SmartCacheService {
        if (!SmartCacheService.instance) {
            SmartCacheService.instance = new SmartCacheService();
        }
        return SmartCacheService.instance;
    }

    private setupEventListeners(): void {
        // Listen for cache access events
        this.redisService.onEvent('hit', ({ key, latency }) => {
            this.recordAccess(key, latency);
        });

        this.redisService.onEvent('miss', ({ key }) => {
            this.recordMiss(key);
        });

        // Monitor cache performance
        setInterval(() => {
            this.analyzePatterns();
            this.updateCacheCategories();
        }, cacheConfig.monitoring.metrics.collection.interval);
    }

    private recordAccess(key: string, latency: number): void {
        const now = Date.now();
        const pattern = this.analytics.patterns.get(key) || {
            key,
            accessCount: 0,
            lastAccess: now,
            avgInterval: 0,
            predictedNextAccess: 0,
        };

        // Update access history
        const history = this.analytics.accessHistory.get(key) || [];
        history.push(now);
        if (history.length > this.MAX_HISTORY) {
            history.shift();
        }
        this.analytics.accessHistory.set(key, history);

        // Update pattern
        pattern.accessCount++;
        if (pattern.lastAccess) {
            const interval = now - pattern.lastAccess;
            pattern.avgInterval = (pattern.avgInterval * (pattern.accessCount - 1) + interval) / pattern.accessCount;
            pattern.predictedNextAccess = now + pattern.avgInterval;
        }
        pattern.lastAccess = now;

        this.analytics.patterns.set(key, pattern);
    }

    private recordMiss(key: string): void {
        this.analytics.coldKeys.add(key);
        this.analytics.hotKeys.delete(key);
    }

    private analyzePatterns(): void {
        const now = Date.now();
        for (const [key, pattern] of this.analytics.patterns) {
            if (pattern.accessCount >= this.PATTERN_THRESHOLD) {
                // Check if the pattern is still active
                const timeSinceLastAccess = now - pattern.lastAccess;
                if (timeSinceLastAccess > pattern.avgInterval * 2) {
                    // Pattern might be stale
                    this.analytics.patterns.delete(key);
                    continue;
                }

                // Update predictions
                const history = this.analytics.accessHistory.get(key) || [];
                if (history.length >= 2) {
                    const intervals = history.slice(1).map((time, i) => time - history[i]);
                    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                    pattern.avgInterval = avgInterval;
                    pattern.predictedNextAccess = pattern.lastAccess + avgInterval;
                }
            }
        }
    }

    private updateCacheCategories(): void {
        const now = Date.now();
        const metrics = this.redisService.getMetrics();

        for (const [key, pattern] of this.analytics.patterns) {
            if (pattern.accessCount >= this.PATTERN_THRESHOLD) {
                const timeSinceLastAccess = now - pattern.lastAccess;
                if (timeSinceLastAccess < pattern.avgInterval * 1.5) {
                    this.analytics.hotKeys.add(key);
                    this.analytics.coldKeys.delete(key);
                } else {
                    this.analytics.hotKeys.delete(key);
                    this.analytics.coldKeys.add(key);
                }
            }
        }

        // Emit analytics event
        this.emit('analytics', {
            hotKeys: Array.from(this.analytics.hotKeys),
            coldKeys: Array.from(this.analytics.coldKeys),
            patterns: Array.from(this.analytics.patterns.values()),
            cacheMetrics: metrics,
        });
    }

    private startCacheWarmer(): void {
        if (this.warmerInterval) {
            clearInterval(this.warmerInterval);
        }

        this.warmerInterval = setInterval(async () => {
            const now = Date.now();
            const predictions = Array.from(this.analytics.patterns.values())
                .filter(pattern => {
                    const timeToAccess = pattern.predictedNextAccess - now;
                    return timeToAccess > 0 && timeToAccess < this.WARM_INTERVAL;
                });

            for (const pattern of predictions) {
                try {
                    // Pre-fetch the data
                    await this.redisService.get(pattern.key);
                } catch (error) {
                    console.error('Error warming cache for key:', pattern.key, error);
                }
            }
        }, this.WARM_INTERVAL);
    }

    public getAnalytics() {
        return {
            hotKeys: Array.from(this.analytics.hotKeys),
            coldKeys: Array.from(this.analytics.coldKeys),
            patterns: Array.from(this.analytics.patterns.values()),
            cacheMetrics: this.redisService.getMetrics(),
        };
    }

    public getPredictions(): Array<{ key: string; predictedAccess: number; confidence: number }> {
        const now = Date.now();
        return Array.from(this.analytics.patterns.values())
            .filter(pattern => pattern.accessCount >= this.PATTERN_THRESHOLD)
            .map(pattern => {
                const history = this.analytics.accessHistory.get(pattern.key) || [];
                const intervals = history.slice(1).map((time, i) => time - history[i]);
                const stdDev = Math.sqrt(
                    intervals.reduce((acc, interval) => acc + Math.pow(interval - pattern.avgInterval, 2), 0) /
                    intervals.length
                );
                const confidence = 1 - (stdDev / pattern.avgInterval);

                return {
                    key: pattern.key,
                    predictedAccess: pattern.predictedNextAccess,
                    confidence: Math.max(0, Math.min(1, confidence)),
                };
            });
    }

    public async optimizeCache(): Promise<void> {
        const analytics = this.getAnalytics();
        const predictions = this.getPredictions();

        // Adjust TTLs based on access patterns
        for (const key of analytics.hotKeys) {
            const currentTTL = await this.redisService.client.ttl(key);
            if (currentTTL > 0) {
                // Increase TTL for frequently accessed keys
                await this.redisService.client.expire(key, currentTTL * 1.5);
            }
        }

        // Pre-warm cache for high-confidence predictions
        const highConfidencePredictions = predictions.filter(p => p.confidence > 0.8);
        for (const prediction of highConfidencePredictions) {
            const timeToAccess = prediction.predictedAccess - Date.now();
            if (timeToAccess > 0 && timeToAccess < this.WARM_INTERVAL) {
                try {
                    await this.redisService.get(prediction.key);
                } catch (error) {
                    console.error('Error pre-warming cache for key:', prediction.key, error);
                }
            }
        }
    }

    public async shutdown(): Promise<void> {
        if (this.warmerInterval) {
            clearInterval(this.warmerInterval);
        }
        this.removeAllListeners();
    }
} 