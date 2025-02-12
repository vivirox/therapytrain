import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { OptimizedDatabaseService } from './OptimizedDatabaseService';
import { getCacheTTL, shouldInvalidateCache } from '../config/database.config';

export interface StorageItem<T> extends Record<string, any> {
    data: T;
}

class DataService {
    private static instance: DataService;
    private client: SupabaseClient<Database>;
    private dbService: OptimizedDatabaseService;

    private constructor(client: SupabaseClient<Database>) {
        this.client = client;
        this.dbService = OptimizedDatabaseService.getInstance(client);
    }

    public static getInstance(client: SupabaseClient<Database>): DataService {
        if (!DataService.instance) {
            DataService.instance = new DataService(client);
        }
        return DataService.instance;
    }

    public async create<T>(table: string, data: T): Promise<StorageItem<T>> {
        const result = await this.dbService.insert<StorageItem<T>>(table, data, {
            cache: shouldInvalidateCache(table as any),
            cacheTTL: getCacheTTL(table as any)
        });

        if (!result || result.length === 0) {
            throw new Error("No data returned");
        }

        return result[0];
    }

    public async get<T>(table: string, id: string): Promise<StorageItem<T> | null> {
        const results = await this.dbService.select<StorageItem<T>>(table, {
            where: { id },
            cache: true,
            cacheTTL: getCacheTTL(table as any)
        });

        return results[0] || null;
    }

    public async update<T>(
        table: string,
        id: string,
        updates: Partial<T>
    ): Promise<StorageItem<T> | null> {
        const results = await this.dbService.update<StorageItem<T>>(
            table,
            { id },
            updates,
            {
                cache: shouldInvalidateCache(table as any),
                cacheTTL: getCacheTTL(table as any)
            }
        );

        return results[0] || null;
    }

    public async delete<T>(table: string, id: string): Promise<StorageItem<T> | null> {
        const results = await this.dbService.delete<StorageItem<T>>(
            table,
            { id },
            { cache: shouldInvalidateCache(table as any) }
        );

        return results[0] || null;
    }

    public async list<T>(
        table: string,
        query: Record<string, any> = {},
        options: {
            orderBy?: string;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<Array<StorageItem<T>>> {
        return await this.dbService.select<StorageItem<T>>(table, {
            where: query,
            ...options,
            cache: true,
            cacheTTL: getCacheTTL(table as any)
        });
    }

    public async findOne<T>(
        table: string,
        query: Record<string, any>
    ): Promise<StorageItem<T> | null> {
        const results = await this.dbService.select<StorageItem<T>>(table, {
            where: query,
            limit: 1,
            cache: true,
            cacheTTL: getCacheTTL(table as any)
        });

        return results[0] || null;
    }

    public async batch<T>(operations: {
        type: 'create' | 'update' | 'delete';
        table: string;
        data?: any;
        where?: Record<string, any>;
    }[]): Promise<Array<StorageItem<T>[]>> {
        const mappedOperations = operations.map(op => ({
            type: op.type === 'create' ? 'insert' : op.type,
            table: op.table,
            data: op.data,
            where: op.where
        }));

        return await this.dbService.batch<StorageItem<T>>(mappedOperations);
    }

    /**
     * Get database performance metrics
     */
    public getPerformanceMetrics() {
        return this.dbService.generateReport();
    }
}
