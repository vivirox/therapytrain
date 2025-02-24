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

-- Function to get slow queries from pg_stat_statements
CREATE OR REPLACE FUNCTION get_slow_queries(p_min_exec_time float DEFAULT 1000)
RETURNS TABLE (
    query text,
    calls bigint,
    total_time double precision,
    mean_time double precision,
    rows bigint
) SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        query::text,
        calls,
        total_exec_time as total_time,
        mean_exec_time as mean_time,
        rows
    FROM pg_stat_statements
    WHERE mean_exec_time > p_min_exec_time
    ORDER BY mean_exec_time DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
    table_name text,
    total_rows bigint,
    total_size text,
    index_size text,
    cache_hit_ratio float,
    seq_scans bigint,
    index_scans bigint,
    dead_tuples bigint,
    mod_since_analyze bigint
) SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || relname as table_name,
        n_live_tup as total_rows,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname || '.' || relname)) as index_size,
        CASE WHEN heap_blks_hit + heap_blks_read = 0 THEN 0
             ELSE heap_blks_hit::float / (heap_blks_hit + heap_blks_read)
        END as cache_hit_ratio,
        seq_scan as seq_scans,
        idx_scan as index_scans,
        n_dead_tup as dead_tuples,
        n_mod_since_analyze as mod_since_analyze
    FROM pg_stat_user_tables
    JOIN pg_statio_user_tables ON pg_stat_user_tables.relid = pg_statio_user_tables.relid
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get index statistics
CREATE OR REPLACE FUNCTION get_index_stats()
RETURNS TABLE (
    table_name text,
    index_name text,
    index_size text,
    index_scans bigint,
    rows_fetched bigint,
    cache_hit_ratio float
) SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || tablename as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(schemaname || '.' || indexrelname::text)) as index_size,
        idx_scan as index_scans,
        idx_tup_fetch as rows_fetched,
        CASE WHEN idx_blks_hit + idx_blks_read = 0 THEN 0
             ELSE idx_blks_hit::float / (idx_blks_hit + idx_blks_read)
        END as cache_hit_ratio
    FROM pg_stat_user_indexes
    JOIN pg_statio_user_indexes ON pg_stat_user_indexes.indexrelid = pg_statio_user_indexes.indexrelid
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze query patterns
CREATE OR REPLACE FUNCTION analyze_query_patterns(
    p_table_name text,
    p_days integer DEFAULT 7
)
RETURNS TABLE (
    pattern text,
    frequency bigint,
    avg_duration double precision,
    total_rows bigint,
    cache_hit_ratio float
) SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        regexp_replace(query, '\$\d+', '?', 'g') as pattern,
        count(*) as frequency,
        avg(total_exec_time) as avg_duration,
        sum(rows) as total_rows,
        sum(shared_blks_hit)::float / nullif(sum(shared_blks_hit + shared_blks_read), 0) as cache_hit_ratio
    FROM pg_stat_statements
    WHERE query ILIKE '%' || p_table_name || '%'
    AND query NOT ILIKE '%pg_stat_statements%'
    GROUP BY regexp_replace(query, '\$\d+', '?', 'g')
    HAVING count(*) > 1
    ORDER BY avg(total_exec_time) DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function to get index recommendations
CREATE OR REPLACE FUNCTION get_index_recommendations(p_table_name text)
RETURNS TABLE (
    column_name text,
    reason text,
    recommendation text
) SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH table_stats AS (
        SELECT 
            attname,
            n_distinct,
            correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        AND tablename = p_table_name
    ),
    existing_indexes AS (
        SELECT 
            array_agg(a.attname) as columns
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = (p_table_name)::regclass
        GROUP BY i.indexrelid
    )
    SELECT 
        s.attname,
        CASE 
            WHEN s.n_distinct > 0.5 AND s.correlation < 0.5 THEN 'High cardinality, low correlation'
            WHEN s.n_distinct > 0.5 THEN 'High cardinality'
            WHEN s.correlation < 0.5 THEN 'Low correlation'
            ELSE 'Frequently queried'
        END,
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM existing_indexes 
                WHERE s.attname = ANY(columns)
            ) THEN 'Consider creating index'
            ELSE 'Index exists'
        END
    FROM table_stats s
    WHERE s.n_distinct > 0.1 OR s.correlation < 0.5
    ORDER BY s.n_distinct DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_hypothetical_index(text, text[], text) TO monitoring_role;
GRANT EXECUTE ON FUNCTION analyze_query_plans() TO monitoring_role;
GRANT EXECUTE ON FUNCTION get_slow_queries(float) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_index_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_query_patterns(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_index_recommendations(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_bloat_stats(text) TO postgres; 