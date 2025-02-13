-- Function to get query statistics
CREATE OR REPLACE FUNCTION get_query_stats()
RETURNS TABLE (
    query text,
    calls bigint,
    total_exec_time double precision,
    mean_exec_time double precision,
    rows bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT query,
           calls,
           total_exec_time,
           mean_exec_time,
           rows
    FROM pg_stat_statements
    ORDER BY total_exec_time DESC
    LIMIT 100;
$$;

-- Function to get cache hit rates
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
                ELSE sum(idx_blks_hit)::numeric / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)
           END as ratio
    FROM pg_statio_user_indexes
    UNION ALL
    SELECT 'table hit rate' as name,
           CASE WHEN sum(heap_blks_hit) = 0 THEN 0
                ELSE sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)
           END as ratio
    FROM pg_statio_user_tables;
$$;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(p_min_exec_time integer DEFAULT 1000)
RETURNS TABLE (
    query text,
    calls bigint,
    mean_exec_time double precision,
    max_exec_time double precision,
    stddev_exec_time double precision
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT query,
           calls,
           mean_exec_time,
           max_exec_time,
           stddev_exec_time
    FROM pg_stat_statements
    WHERE mean_exec_time > p_min_exec_time
    ORDER BY mean_exec_time DESC
    LIMIT 20;
$$;

-- Function to get frequently executed queries
CREATE OR REPLACE FUNCTION get_frequent_queries(p_min_calls integer DEFAULT 100)
RETURNS TABLE (
    query text,
    calls bigint,
    mean_exec_time double precision,
    total_exec_time double precision
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT query,
           calls,
           mean_exec_time,
           total_exec_time
    FROM pg_stat_statements
    WHERE calls > p_min_calls
    ORDER BY calls DESC
    LIMIT 20;
$$;

-- Function to get table bloat information
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
        SELECT current_setting('block_size')::numeric AS bs
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
    table_bloat AS (
        SELECT table_schema as schemaname, 
               table_name as tablename,
               ROUND(100 * (table_size - (est_rows * 100)) / table_size) as bloat_ratio,
               table_size * ((100 - ROUND(100 * (table_size - (est_rows * 100)) / table_size))/100) as wasted_bytes
        FROM no_stats
    )
    SELECT * FROM table_bloat
    WHERE bloat_ratio > 10
    ORDER BY wasted_bytes DESC;
$$;

-- Function to get index usage statistics
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
    SELECT s.schemaname::name,
           s.relname::name as tablename,
           s.indexrelname::name as indexname,
           s.idx_scan,
           s.idx_tup_read,
           s.idx_tup_fetch
    FROM pg_stat_user_indexes s
    WHERE s.idx_scan = 0
    AND s.schemaname NOT IN ('pg_catalog', 'pg_toast')
    ORDER BY s.schemaname, s.relname;
$$;

-- Function to analyze hypothetical indexes
CREATE OR REPLACE FUNCTION analyze_hypothetical_index(
    p_table_name text,
    p_column_names text[],
    p_index_type text DEFAULT 'btree'
)
RETURNS TABLE (
    query text,
    original_cost float,
    hypothetical_cost float,
    improvement_factor float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hypo_index_oid oid;
BEGIN
    -- Create hypothetical index
    SELECT hypopg_create_index(
        format('CREATE INDEX ON %I USING %s (%s)',
            p_table_name,
            p_index_type,
            array_to_string(p_column_names, ', ')
        )
    ) INTO v_hypo_index_oid;

    RETURN QUERY
    WITH relevant_queries AS (
        SELECT query, calls, mean_exec_time + mean_plan_time as mean_time
        FROM pg_stat_statements
        WHERE query ~* p_table_name
        AND mean_exec_time + mean_plan_time > 100  -- queries taking more than 100ms
        ORDER BY mean_time DESC
        LIMIT 10
    ),
    query_plans AS (
        SELECT
            q.query,
            -- Get original plan cost
            (SELECT total_cost::float
             FROM pg_catalog.pg_stat_statements_info
             WHERE queryid = q.queryid) as original_cost,
            -- Get hypothetical plan cost
            (SELECT total_cost::float
             FROM hypopg_get_index_stats(v_hypo_index_oid)) as hypothetical_cost
        FROM relevant_queries q
    )
    SELECT
        query,
        original_cost,
        hypothetical_cost,
        CASE
            WHEN hypothetical_cost = 0 THEN 0
            ELSE original_cost / NULLIF(hypothetical_cost, 0)
        END as improvement_factor
    FROM query_plans
    WHERE original_cost > hypothetical_cost
    ORDER BY improvement_factor DESC;

    -- Cleanup
    PERFORM hypopg_reset();
END;
$$; 