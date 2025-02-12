import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { DatabaseMonitoringService } from '../services/DatabaseMonitoringService';
import { OptimizedDatabaseService } from '../services/OptimizedDatabaseService';

const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const monitoringService = DatabaseMonitoringService.getInstance(supabase);
const dbService = OptimizedDatabaseService.getInstance(supabase);

async function analyzeQueryPatterns() {
    // Get query statistics
    const stats = await supabase.rpc('get_query_stats');
    console.log('Query Statistics:', stats);

    // Get table statistics
    const tables = ['sessions', 'profiles', 'messages'];
    for (const table of tables) {
        const tableStats = await monitoringService.getTableStats(table);
        console.log(`Table ${table} Statistics:`, tableStats);
    }

    // Get performance report
    const performanceReport = monitoringService.generatePerformanceReport();
    console.log('Performance Report:', performanceReport);

    // Get optimization recommendations
    const recommendations = monitoringService.getOptimizationRecommendations();
    console.log('Optimization Recommendations:', recommendations);

    // Analyze cache hit rates
    const cacheStats = await supabase.rpc('get_cache_hit_rates');
    console.log('Cache Hit Rates:', cacheStats);

    // Get slow queries
    const slowQueries = await supabase.rpc('get_slow_queries', {
        threshold_ms: 1000 // queries taking more than 1 second
    });
    console.log('Slow Queries:', slowQueries);

    // Get most frequent queries
    const frequentQueries = await supabase.rpc('get_frequent_queries', {
        min_calls: 100 // queries called at least 100 times
    });
    console.log('Most Frequent Queries:', frequentQueries);

    // Get table bloat information
    const tableBloat = await supabase.rpc('get_table_bloat');
    console.log('Table Bloat:', tableBloat);

    // Get index usage statistics
    const indexStats = await supabase.rpc('get_index_usage_stats');
    console.log('Index Usage:', indexStats);
}

// Create necessary database functions
async function createAnalysisFunctions() {
    // Function to get query statistics
    await supabase.rpc('create_function_get_query_stats', {
        definition: `
            CREATE OR REPLACE FUNCTION get_query_stats()
            RETURNS TABLE (
                query text,
                calls bigint,
                total_time double precision,
                mean_time double precision,
                rows bigint
            )
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
                SELECT query, calls, total_exec_time + total_plan_time as total_time,
                       mean_exec_time + mean_plan_time as mean_time, rows
                FROM pg_stat_statements
                ORDER BY total_time DESC
                LIMIT 100;
            $$;
        `
    });

    // Function to get cache hit rates
    await supabase.rpc('create_function_get_cache_hit_rates', {
        definition: `
            CREATE OR REPLACE FUNCTION get_cache_hit_rates()
            RETURNS TABLE (
                name text,
                ratio numeric
            )
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
                SELECT 'index hit rate' as name,
                       CASE WHEN sum(idx_blks_hit) = 0 THEN 0
                            ELSE sum(idx_blks_hit)::numeric / sum(idx_blks_hit + idx_blks_read)
                       END as ratio
                FROM pg_statio_user_indexes
                UNION ALL
                SELECT 'table hit rate' as name,
                       CASE WHEN sum(heap_blks_hit) = 0 THEN 0
                            ELSE sum(heap_blks_hit)::numeric / sum(heap_blks_hit + heap_blks_read)
                       END as ratio
                FROM pg_statio_user_tables;
            $$;
        `
    });

    // Function to get slow queries
    await supabase.rpc('create_function_get_slow_queries', {
        definition: `
            CREATE OR REPLACE FUNCTION get_slow_queries(threshold_ms integer)
            RETURNS TABLE (
                query text,
                mean_time double precision,
                calls bigint
            )
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
                SELECT query, mean_exec_time + mean_plan_time as mean_time, calls
                FROM pg_stat_statements
                WHERE mean_exec_time + mean_plan_time > threshold_ms
                ORDER BY mean_time DESC
                LIMIT 50;
            $$;
        `
    });

    // Function to get frequent queries
    await supabase.rpc('create_function_get_frequent_queries', {
        definition: `
            CREATE OR REPLACE FUNCTION get_frequent_queries(min_calls integer)
            RETURNS TABLE (
                query text,
                calls bigint,
                mean_time double precision
            )
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
                SELECT query, calls, mean_exec_time + mean_plan_time as mean_time
                FROM pg_stat_statements
                WHERE calls >= min_calls
                ORDER BY calls DESC
                LIMIT 50;
            $$;
        `
    });

    // Function to get table bloat information
    await supabase.rpc('create_function_get_table_bloat', {
        definition: `
            CREATE OR REPLACE FUNCTION get_table_bloat()
            RETURNS TABLE (
                schemaname name,
                tablename name,
                bloat_ratio numeric,
                wasted_bytes bigint
            )
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
                WITH constants AS (
                    SELECT current_setting('block_size')::numeric AS bs,
                           23 AS hdr,
                           8 AS ma
                ),
                no_stats AS (
                    SELECT table_schema, table_name, 
                           n_live_tup::numeric as est_rows,
                           pg_table_size(relid)::numeric as table_size
                    FROM information_schema.tables
                    JOIN pg_stat_user_tables as psut
                         ON relname = table_name
                    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ),
                null_headers AS (
                    SELECT hdr+1+(sum(case when null_frac <> 0 THEN 1 else 0 END)/8) as nullhdr
                    FROM pg_stats s
                    JOIN constants ON true
                    GROUP BY schemaname, tablename
                ),
                table_bloat AS (
                    SELECT schemaname, tablename,
                           ROUND(100 * (table_size - (est_rows * ((-1/8.0)::numeric * bs)::numeric)) / table_size) as bloat_ratio,
                           table_size * ((100 - bloat_ratio)/100) as wasted_bytes
                    FROM no_stats
                )
                SELECT * FROM table_bloat
                WHERE bloat_ratio > 10
                ORDER BY wasted_bytes DESC;
            $$;
        `
    });

    // Function to get index usage statistics
    await supabase.rpc('create_function_get_index_usage_stats', {
        definition: `
            CREATE OR REPLACE FUNCTION get_index_usage_stats()
            RETURNS TABLE (
                schemaname name,
                tablename name,
                indexname name,
                idx_scan bigint,
                idx_tup_read bigint,
                idx_tup_fetch bigint
            )
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
                SELECT schemaname, tablename, indexname,
                       idx_scan, idx_tup_read, idx_tup_fetch
                FROM pg_stat_user_indexes
                WHERE idx_scan = 0
                AND schemaname NOT IN ('pg_catalog', 'pg_toast')
                ORDER BY schemaname, tablename;
            $$;
        `
    });
}

async function main() {
    try {
        console.log('Creating analysis functions...');
        await createAnalysisFunctions();

        console.log('Analyzing database performance...');
        await analyzeQueryPatterns();

        // Get recommendations from monitoring service
        const report = monitoringService.generatePerformanceReport();
        console.log('\nPerformance Report:', report);

        // Suggest indexes based on query patterns
        const recommendations = monitoringService.getOptimizationRecommendations();
        console.log('\nOptimization Recommendations:', recommendations);

    } catch (error) {
        console.error('Error analyzing database performance:', error);
    }
}

main(); 