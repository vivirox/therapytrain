-- Function to analyze query plans with hypothetical indexes
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

-- Function to analyze all query plans
CREATE OR REPLACE FUNCTION analyze_query_plans()
RETURNS TABLE (
    query text,
    total_time double precision,
    calls bigint,
    mean_time double precision,
    rows_per_call numeric,
    shared_blks_hit bigint,
    shared_blks_read bigint,
    shared_blks_dirtied bigint,
    shared_blks_written bigint,
    local_blks_hit bigint,
    local_blks_read bigint,
    temp_blks_read bigint,
    temp_blks_written bigint,
    blk_read_time double precision,
    blk_write_time double precision
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        query,
        total_exec_time + total_plan_time as total_time,
        calls,
        mean_exec_time + mean_plan_time as mean_time,
        rows::numeric / calls as rows_per_call,
        shared_blks_hit,
        shared_blks_read,
        shared_blks_dirtied,
        shared_blks_written,
        local_blks_hit,
        local_blks_read,
        temp_blks_read,
        temp_blks_written,
        blk_read_time,
        blk_write_time
    FROM pg_stat_statements
    WHERE total_exec_time + total_plan_time > 1000  -- queries taking more than 1 second
    ORDER BY total_time DESC
    LIMIT 100;
$$;

-- Function to get table and index statistics
CREATE OR REPLACE FUNCTION get_table_stats(
    p_schema text DEFAULT 'public'
)
RETURNS TABLE (
    table_name text,
    total_rows bigint,
    total_size text,
    index_size text,
    cache_hit_ratio numeric,
    seq_scans bigint,
    index_scans bigint,
    dead_tuples bigint,
    mod_since_analyze bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH table_stats AS (
        SELECT
            schemaname,
            relname,
            n_live_tup,
            n_dead_tup,
            n_mod_since_analyze,
            seq_scan,
            idx_scan,
            heap_blks_read,
            heap_blks_hit,
            idx_blks_read,
            idx_blks_hit
        FROM pg_stat_user_tables
        WHERE schemaname = p_schema
    ),
    table_sizes AS (
        SELECT
            schemaname,
            relname,
            pg_size_pretty(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))) as total_size,
            pg_size_pretty(pg_indexes_size(quote_ident(schemaname) || '.' || quote_ident(relname))) as index_size
        FROM pg_stat_user_tables
        WHERE schemaname = p_schema
    )
    SELECT
        s.relname::text as table_name,
        s.n_live_tup as total_rows,
        z.total_size,
        z.index_size,
        CASE WHEN s.heap_blks_hit + s.heap_blks_read + s.idx_blks_hit + s.idx_blks_read = 0 THEN 0
             ELSE round(100.0 * (s.heap_blks_hit + s.idx_blks_hit) /
                  NULLIF(s.heap_blks_hit + s.heap_blks_read + s.idx_blks_hit + s.idx_blks_read, 0), 2)
        END as cache_hit_ratio,
        s.seq_scan,
        s.idx_scan,
        s.n_dead_tup as dead_tuples,
        s.n_mod_since_analyze as mod_since_analyze
    FROM table_stats s
    JOIN table_sizes z ON s.schemaname = z.schemaname AND s.relname = z.relname
    ORDER BY s.n_live_tup DESC;
$$;

-- Function to get detailed index statistics
CREATE OR REPLACE FUNCTION get_index_stats(
    p_schema text DEFAULT 'public'
)
RETURNS TABLE (
    table_name text,
    index_name text,
    index_size text,
    index_scans bigint,
    rows_per_scan numeric,
    cache_hit_ratio numeric,
    index_type text,
    is_unique boolean,
    is_primary boolean,
    is_exclusion boolean,
    columns text[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH index_stats AS (
        SELECT
            schemaname,
            tablename,
            indexrelname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch,
            idx_blks_read,
            idx_blks_hit
        FROM pg_stat_user_indexes
        WHERE schemaname = p_schema
    ),
    index_info AS (
        SELECT
            i.schemaname,
            i.tablename,
            i.indexrelname,
            pg_size_pretty(pg_relation_size(quote_ident(i.schemaname) || '.' || quote_ident(i.indexrelname))) as index_size,
            am.amname as index_type,
            ix.indisunique,
            ix.indisprimary,
            ix.indisexclusion,
            array_agg(a.attname ORDER BY k.i) as columns
        FROM pg_stat_user_indexes i
        JOIN pg_index ix ON ix.indexrelid = i.indexrelid
        JOIN pg_class c ON c.oid = ix.indrelid
        JOIN pg_am am ON am.oid = c.relam
        JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
        JOIN generate_series(1, array_length(ix.indkey, 1)) k(i) ON ix.indkey[k.i-1] = a.attnum
        WHERE i.schemaname = p_schema
        GROUP BY i.schemaname, i.tablename, i.indexrelname, am.amname, ix.indisunique, ix.indisprimary, ix.indisexclusion
    )
    SELECT
        s.tablename::text as table_name,
        s.indexrelname::text as index_name,
        i.index_size,
        s.idx_scan as index_scans,
        CASE WHEN s.idx_scan = 0 THEN 0
             ELSE round(s.idx_tup_read::numeric / s.idx_scan, 2)
        END as rows_per_scan,
        CASE WHEN s.idx_blks_hit + s.idx_blks_read = 0 THEN 0
             ELSE round(100.0 * s.idx_blks_hit / NULLIF(s.idx_blks_hit + s.idx_blks_read, 0), 2)
        END as cache_hit_ratio,
        i.index_type,
        i.indisunique,
        i.indisprimary,
        i.indisexclusion,
        i.columns
    FROM index_stats s
    JOIN index_info i ON s.schemaname = i.schemaname 
        AND s.tablename = i.tablename 
        AND s.indexrelname = i.indexrelname
    ORDER BY s.idx_scan DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_hypothetical_index(text, text[], text) TO monitoring_role;
GRANT EXECUTE ON FUNCTION analyze_query_plans() TO monitoring_role;
GRANT EXECUTE ON FUNCTION get_table_stats(text) TO monitoring_role;
GRANT EXECUTE ON FUNCTION get_index_stats(text) TO monitoring_role; 