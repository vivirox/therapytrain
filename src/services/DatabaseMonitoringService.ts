import { SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

interface QueryMetrics {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  rows: number;
}

interface TableStats {
  tableName: string;
  totalRows: number;
  totalSize: string;
  indexSize: string;
  cacheHitRatio: number;
  seqScans: number;
  indexScans: number;
  deadTuples: number;
  modSinceAnalyze: number;
}

interface IndexStats {
  tableName: string;
  indexName: string;
  indexSize: string;
  indexScans: number;
  rowsFetched: number;
  cacheHitRatio: number;
}

interface PerformanceReport {
  slowQueries: QueryMetrics[];
  tableStats: TableStats[];
  indexStats: IndexStats[];
  recommendations: string[];
}

export class DatabaseMonitoringService {
  private static instance: DatabaseMonitoringService;
  private client: SupabaseClient;
  private performanceData: Map<string, number[]>;
  private queryHistory: Map<string, QueryMetrics>;

  private constructor(client: SupabaseClient) {
    this.client = client;
    this.performanceData = new Map();
    this.queryHistory = new Map();
  }

  public static getInstance(client: SupabaseClient): DatabaseMonitoringService {
    if (!DatabaseMonitoringService.instance) {
      DatabaseMonitoringService.instance = new DatabaseMonitoringService(client);
    }
    return DatabaseMonitoringService.instance;
  }

  public async trackQuery(queryId: string, queryFn: () => Promise<any>): Promise<any> {
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      this.recordQueryMetrics(queryId, duration, result?.length || 0);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordQueryMetrics(queryId, duration, 0, true);
      throw error;
    }
  }

  private recordQueryMetrics(queryId: string, duration: number, rows: number, isError: boolean = false) {
    const metrics = this.queryHistory.get(queryId) || {
      query: queryId,
      calls: 0,
      totalTime: 0,
      meanTime: 0,
      rows: 0
    };

    metrics.calls++;
    metrics.totalTime += duration;
    metrics.meanTime = metrics.totalTime / metrics.calls;
    metrics.rows += rows;

    this.queryHistory.set(queryId, metrics);

    const performanceHistory = this.performanceData.get(queryId) || [];
    performanceHistory.push(duration);
    if (performanceHistory.length > 100) performanceHistory.shift();
    this.performanceData.set(queryId, performanceHistory);

    if (duration > 1000 || isError) {
      this.reportSlowQuery(queryId, metrics);
    }
  }

  private async reportSlowQuery(queryId: string, metrics: QueryMetrics) {
    if (process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'database',
        message: 'Slow query detected',
        level: 'warning',
        data: {
          queryId,
          duration: metrics.meanTime,
          calls: metrics.calls
        }
      });
    }
  }

  public async generatePerformanceReport(): Promise<PerformanceReport> {
    try {
      const [slowQueries, tableStats, indexStats] = await Promise.all([
        this.getSlowQueries(),
        this.getTableStats(),
        this.getIndexStats()
      ]);

      const recommendations = await this.generateRecommendations(
        slowQueries,
        tableStats,
        indexStats
      );

      return {
        slowQueries,
        tableStats,
        indexStats,
        recommendations
      };
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  private async getSlowQueries(): Promise<QueryMetrics[]> {
    const { data, error } = await this.client.rpc('get_slow_queries', {
      p_min_exec_time: 1000
    });

    if (error) throw error;
    return data;
  }

  private async getTableStats(): Promise<TableStats[]> {
    const { data, error } = await this.client.rpc('get_table_stats');
    if (error) throw error;
    return data;
  }

  private async getIndexStats(): Promise<IndexStats[]> {
    const { data, error } = await this.client.rpc('get_index_stats');
    if (error) throw error;
    return data;
  }

  private async generateRecommendations(
    slowQueries: QueryMetrics[],
    tableStats: TableStats[],
    indexStats: IndexStats[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze slow queries
    for (const query of slowQueries) {
      if (query.meanTime > 2000) {
        recommendations.push(`Query "${query.query.substring(0, 100)}..." is consistently slow (${query.meanTime.toFixed(2)}ms). Consider optimization.`);
      }
    }

    // Analyze table statistics
    for (const table of tableStats) {
      if (table.seqScans > table.indexScans * 2) {
        recommendations.push(`Table "${table.tableName}" has high sequential scans. Consider adding indexes.`);
      }
      if (table.deadTuples > table.totalRows * 0.2) {
        recommendations.push(`Table "${table.tableName}" has high dead tuple ratio. Consider running VACUUM.`);
      }
      if (table.cacheHitRatio < 0.8) {
        recommendations.push(`Table "${table.tableName}" has low cache hit ratio. Consider increasing shared_buffers.`);
      }
    }

    // Analyze index statistics
    for (const index of indexStats) {
      if (index.indexScans === 0) {
        recommendations.push(`Index "${index.indexName}" on table "${index.tableName}" is unused. Consider removing.`);
      }
      if (index.cacheHitRatio < 0.8) {
        recommendations.push(`Index "${index.indexName}" has low cache hit ratio. Consider increasing effective_cache_size.`);
      }
    }

    return recommendations;
  }

  public getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze query patterns
    for (const [queryId, metrics] of this.queryHistory.entries()) {
      const performanceHistory = this.performanceData.get(queryId) || [];
      const avgDuration = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length;
      
      if (avgDuration > 1000) {
        recommendations.push(`Query pattern "${queryId}" consistently takes ${avgDuration.toFixed(2)}ms. Consider optimization.`);
      }
      
      if (metrics.calls > 1000 && metrics.meanTime > 100) {
        recommendations.push(`Query pattern "${queryId}" is called frequently (${metrics.calls} times) with moderate latency. Consider caching.`);
      }
    }

    return recommendations;
  }

  public async analyzeQueryPattern(queryId: string): Promise<{
    metrics: QueryMetrics;
    recommendations: string[];
  }> {
    const metrics = this.queryHistory.get(queryId);
    if (!metrics) {
      return {
        metrics: {
          query: queryId,
          calls: 0,
          totalTime: 0,
          meanTime: 0,
          rows: 0
        },
        recommendations: []
      };
    }

    const recommendations: string[] = [];
    const performanceHistory = this.performanceData.get(queryId) || [];
    
    // Analyze performance patterns
    const avgDuration = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length;
    const stdDev = Math.sqrt(
      performanceHistory.reduce((a, b) => a + Math.pow(b - avgDuration, 2), 0) / performanceHistory.length
    );

    if (stdDev > avgDuration * 0.5) {
      recommendations.push('Query performance is highly variable. Consider investigating consistency issues.');
    }

    if (metrics.calls > 100 && avgDuration > 100) {
      recommendations.push('Query is frequently used and moderately slow. Consider implementing caching.');
    }

    if (metrics.rows / metrics.calls < 10 && metrics.calls > 1000) {
      recommendations.push('Query returns few rows but is called frequently. Consider batch processing.');
    }

    return { metrics, recommendations };
  }
} 