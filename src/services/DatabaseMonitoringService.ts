import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { EventEmitter } from 'events';

export class DatabaseMonitoringService {
    private static instance: DatabaseMonitoringService;
    private client: SupabaseClient<Database>;
    private eventEmitter: EventEmitter;
    private queryMetrics: Map<string, {
        count: number;
        totalTime: number;
        slowQueries: number;
        errors: number;
        lastExecuted: Date;
    }> = new Map();
    private readonly slowQueryThreshold = 1000; // 1 second

    private constructor(client: SupabaseClient<Database>) {
        this.client = client;
        this.eventEmitter = new EventEmitter();
        this.setupMonitoring();
    }

    public static getInstance(client: SupabaseClient<Database>): DatabaseMonitoringService {
        if (!DatabaseMonitoringService.instance) {
            DatabaseMonitoringService.instance = new DatabaseMonitoringService(client);
        }
        return DatabaseMonitoringService.instance;
    }

    private setupMonitoring(): void {
        // Monitor database events
        this.client.channel('db-monitor')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                this.eventEmitter.emit('dbChange', payload);
            })
            .subscribe();
    }

    /**
     * Track a database query
     */
    public async trackQuery(queryId: string, operation: () => Promise<any>): Promise<any> {
        const startTime = Date.now();
        try {
            const result = await operation();
            const duration = Date.now() - startTime;

            // Update metrics
            const metrics = this.queryMetrics.get(queryId) || {
                count: 0,
                totalTime: 0,
                slowQueries: 0,
                errors: 0,
                lastExecuted: new Date()
            };

            metrics.count++;
            metrics.totalTime += duration;
            metrics.lastExecuted = new Date();

            if (duration > this.slowQueryThreshold) {
                metrics.slowQueries++;
                this.eventEmitter.emit('slowQuery', {
                    queryId,
                    duration,
                    timestamp: new Date()
                });
            }

            this.queryMetrics.set(queryId, metrics);
            return result;
        } catch (error) {
            const metrics = this.queryMetrics.get(queryId) || {
                count: 0,
                totalTime: 0,
                slowQueries: 0,
                errors: 0,
                lastExecuted: new Date()
            };

            metrics.errors++;
            this.queryMetrics.set(queryId, metrics);

            this.eventEmitter.emit('queryError', {
                queryId,
                error,
                timestamp: new Date()
            });

            throw error;
        }
    }

    /**
     * Get query metrics
     */
    public getQueryMetrics(queryId?: string) {
        if (queryId) {
            return this.queryMetrics.get(queryId);
        }

        const allMetrics: Record<string, any> = {};
        this.queryMetrics.forEach((metrics, id) => {
            allMetrics[id] = {
                ...metrics,
                averageTime: metrics.totalTime / metrics.count,
                errorRate: metrics.errors / metrics.count,
                slowQueryRate: metrics.slowQueries / metrics.count
            };
        });

        return allMetrics;
    }

    /**
     * Get optimization recommendations
     */
    public getOptimizationRecommendations(): string[] {
        const recommendations: string[] = [];
        
        this.queryMetrics.forEach((metrics, queryId) => {
            const avgTime = metrics.totalTime / metrics.count;
            const errorRate = metrics.errors / metrics.count;
            const slowQueryRate = metrics.slowQueries / metrics.count;

            if (avgTime > this.slowQueryThreshold) {
                recommendations.push(
                    `Query ${queryId} has high average execution time (${avgTime}ms). Consider adding indexes or optimizing the query.`
                );
            }

            if (errorRate > 0.1) {
                recommendations.push(
                    `Query ${queryId} has high error rate (${(errorRate * 100).toFixed(2)}%). Review error handling and query structure.`
                );
            }

            if (slowQueryRate > 0.2) {
                recommendations.push(
                    `Query ${queryId} frequently exceeds performance threshold (${(slowQueryRate * 100).toFixed(2)}% slow queries). Consider query optimization or caching.`
                );
            }
        });

        return recommendations;
    }

    /**
     * Subscribe to database events
     */
    public onEvent(event: string, callback: (...args: any[]) => void): void {
        this.eventEmitter.on(event, callback);
    }

    /**
     * Reset metrics
     */
    public resetMetrics(): void {
        this.queryMetrics.clear();
    }

    /**
     * Get table statistics
     */
    public async getTableStats(tableName: string) {
        const { data, error } = await this.client
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return {
            totalRows: data?.length || 0,
            lastUpdated: new Date(),
            // Add more statistics as needed
        };
    }

    /**
     * Analyze query patterns
     */
    public analyzeQueryPatterns(): Record<string, any> {
        const patterns: Record<string, any> = {};

        this.queryMetrics.forEach((metrics, queryId) => {
            patterns[queryId] = {
                frequency: metrics.count,
                timing: {
                    average: metrics.totalTime / metrics.count,
                    isProblematic: (metrics.totalTime / metrics.count) > this.slowQueryThreshold
                },
                reliability: {
                    errorRate: metrics.errors / metrics.count,
                    slowQueryRate: metrics.slowQueries / metrics.count
                },
                lastExecuted: metrics.lastExecuted
            };
        });

        return patterns;
    }

    /**
     * Generate performance report
     */
    public generatePerformanceReport() {
        const patterns = this.analyzeQueryPatterns();
        const recommendations = this.getOptimizationRecommendations();

        return {
            summary: {
                totalQueries: this.queryMetrics.size,
                problematicQueries: Object.values(patterns).filter(p => p.timing.isProblematic).length,
                recommendationCount: recommendations.length
            },
            patterns,
            recommendations,
            timestamp: new Date()
        };
    }
} 