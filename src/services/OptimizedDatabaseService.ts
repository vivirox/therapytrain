import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { DatabaseMonitoringService } from './DatabaseMonitoringService';

export class OptimizedDatabaseService {
    private static instance: OptimizedDatabaseService;
    private client: SupabaseClient<Database>;
    private monitoringService: DatabaseMonitoringService;
    private queryCache: Map<string, {
        data: any;
        timestamp: number;
        ttl: number;
    }> = new Map();

    private constructor(client: SupabaseClient<Database>) {
        this.client = client;
        this.monitoringService = DatabaseMonitoringService.getInstance(client);
        this.setupMonitoring();
    }

    public static getInstance(client: SupabaseClient<Database>): OptimizedDatabaseService {
        if (!OptimizedDatabaseService.instance) {
            OptimizedDatabaseService.instance = new OptimizedDatabaseService(client);
        }
        return OptimizedDatabaseService.instance;
    }

    private setupMonitoring(): void {
        this.monitoringService.onEvent('slowQuery', ({ queryId, duration }) => {
            console.warn(`Slow query detected: ${queryId} (${duration}ms)`);
        });

        this.monitoringService.onEvent('queryError', ({ queryId, error }) => {
            console.error(`Query error: ${queryId}`, error);
        });
    }

    /**
     * Execute an optimized select query
     */
    public async select<T>(
        table: string,
        options: {
            columns?: string;
            where?: Record<string, any>;
            orderBy?: string;
            limit?: number;
            offset?: number;
            cache?: boolean;
            cacheTTL?: number;
        } = {}
    ): Promise<T[]> {
        const queryId = this.generateQueryId('select', table, options);

        // Check cache if enabled
        if (options.cache) {
            const cached = this.getCached(queryId);
            if (cached) return cached;
        }

        return await this.monitoringService.trackQuery(queryId, async () => {
            let query = this.client
                .from(table)
                .select(options.columns || '*');

            // Apply filters
            if (options.where) {
                query = this.applyFilters(query, options.where);
            }

            // Apply ordering
            if (options.orderBy) {
                query = query.order(options.orderBy);
            }

            // Apply pagination
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Cache result if enabled
            if (options.cache) {
                this.setCached(queryId, data, options.cacheTTL);
            }

            return data as T[];
        });
    }

    /**
     * Execute an optimized insert operation
     */
    public async insert<T>(
        table: string,
        data: Partial<T> | Partial<T>[],
        options: {
            returning?: string;
            cache?: boolean;
            cacheTTL?: number;
        } = {}
    ): Promise<T[]> {
        const queryId = this.generateQueryId('insert', table, { data });

        return await this.monitoringService.trackQuery(queryId, async () => {
            const { data: result, error } = await this.client
                .from(table)
                .insert(data)
                .select(options.returning || '*');

            if (error) throw error;

            // Invalidate related cache entries
            if (options.cache) {
                this.invalidateTableCache(table);
            }

            return result as T[];
        });
    }

    /**
     * Execute an optimized update operation
     */
    public async update<T>(
        table: string,
        where: Record<string, any>,
        updates: Partial<T>,
        options: {
            returning?: string;
            cache?: boolean;
            cacheTTL?: number;
        } = {}
    ): Promise<T[]> {
        const queryId = this.generateQueryId('update', table, { where, updates });

        return await this.monitoringService.trackQuery(queryId, async () => {
            let query = this.client
                .from(table)
                .update(updates);

            // Apply filters
            query = this.applyFilters(query, where);

            // Select returning columns
            const { data, error } = await query.select(options.returning || '*');
            if (error) throw error;

            // Invalidate related cache entries
            if (options.cache) {
                this.invalidateTableCache(table);
            }

            return data as T[];
        });
    }

    /**
     * Execute an optimized delete operation
     */
    public async delete<T>(
        table: string,
        where: Record<string, any>,
        options: {
            returning?: string;
            cache?: boolean;
        } = {}
    ): Promise<T[]> {
        const queryId = this.generateQueryId('delete', table, { where });

        return await this.monitoringService.trackQuery(queryId, async () => {
            let query = this.client
                .from(table)
                .delete();

            // Apply filters
            query = this.applyFilters(query, where);

            // Select returning columns
            const { data, error } = await query.select(options.returning || '*');
            if (error) throw error;

            // Invalidate related cache entries
            if (options.cache) {
                this.invalidateTableCache(table);
            }

            return data as T[];
        });
    }

    /**
     * Execute a batch operation
     */
    public async batch<T>(operations: {
        type: 'insert' | 'update' | 'delete';
        table: string;
        data?: any;
        where?: Record<string, any>;
    }[]): Promise<T[][]> {
        const results: T[][] = [];

        for (const op of operations) {
            switch (op.type) {
                case 'insert':
                    results.push(await this.insert(op.table, op.data));
                    break;
                case 'update':
                    results.push(await this.update(op.table, op.where!, op.data));
                    break;
                case 'delete':
                    results.push(await this.delete(op.table, op.where!));
                    break;
            }
        }

        return results;
    }

    /**
     * Generate a performance report
     */
    public generateReport() {
        return this.monitoringService.generatePerformanceReport();
    }

    private generateQueryId(operation: string, table: string, params: any): string {
        return `${operation}:${table}:${JSON.stringify(params)}`;
    }

    private getCached(queryId: string): any | null {
        const cached = this.queryCache.get(queryId);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > cached.ttl) {
            this.queryCache.delete(queryId);
            return null;
        }

        return cached.data;
    }

    private setCached(queryId: string, data: any, ttl: number = 60000): void {
        this.queryCache.set(queryId, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    private invalidateTableCache(table: string): void {
        for (const [key] of this.queryCache) {
            if (key.includes(`:${table}:`)) {
                this.queryCache.delete(key);
            }
        }
    }

    private applyFilters(query: any, filters: Record<string, any>): any {
        for (const [key, value] of Object.entries(filters)) {
            if (Array.isArray(value)) {
                query = query.in(key, value);
            } else if (typeof value === 'object') {
                for (const [op, val] of Object.entries(value)) {
                    switch (op) {
                        case 'gt':
                            query = query.gt(key, val);
                            break;
                        case 'gte':
                            query = query.gte(key, val);
                            break;
                        case 'lt':
                            query = query.lt(key, val);
                            break;
                        case 'lte':
                            query = query.lte(key, val);
                            break;
                        case 'like':
                            query = query.like(key, val);
                            break;
                        case 'ilike':
                            query = query.ilike(key, val);
                            break;
                        case 'is':
                            query = query.is(key, val);
                            break;
                    }
                }
            } else {
                query = query.eq(key, value);
            }
        }
        return query;
    }
} 