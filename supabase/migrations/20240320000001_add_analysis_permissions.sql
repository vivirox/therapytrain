-- Grant necessary permissions for database analysis
GRANT pg_read_all_stats TO postgres;
GRANT EXECUTE ON FUNCTION get_query_stats() TO postgres;
GRANT EXECUTE ON FUNCTION get_cache_hit_rates() TO postgres;
GRANT EXECUTE ON FUNCTION get_slow_queries(integer) TO postgres;
GRANT EXECUTE ON FUNCTION get_frequent_queries(integer) TO postgres;
GRANT EXECUTE ON FUNCTION get_table_bloat() TO postgres;
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO postgres;

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS hypopg;  -- For hypothetical index analysis

-- Configure pg_stat_statements to track more information
ALTER SYSTEM SET pg_stat_statements.max = 10000;  -- Track more queries
ALTER SYSTEM SET pg_stat_statements.track = 'all';  -- Track all queries
ALTER SYSTEM SET pg_stat_statements.track_utility = 'on';  -- Track utility commands
ALTER SYSTEM SET pg_stat_statements.save = 'on';  -- Save stats across restarts

-- Create a role for monitoring
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'monitoring_role') THEN
        CREATE ROLE monitoring_role WITH NOLOGIN;
    END IF;
END
$$;

-- Grant necessary permissions to monitoring_role
GRANT pg_read_all_stats TO monitoring_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO monitoring_role;
GRANT USAGE ON SCHEMA public TO monitoring_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_role;

-- Grant monitoring_role to postgres
GRANT monitoring_role TO postgres;

-- Create indexes advisor schema
CREATE SCHEMA IF NOT EXISTS index_advisor;

-- Create table to store index recommendations
CREATE TABLE IF NOT EXISTS index_advisor.recommendations (
    id SERIAL PRIMARY KEY,
    table_name text NOT NULL,
    column_names text[] NOT NULL,
    index_type text NOT NULL,
    reason text NOT NULL,
    estimated_improvement numeric,
    created_at timestamptz DEFAULT now(),
    implemented_at timestamptz,
    is_implemented boolean DEFAULT false
);

-- Grant access to index_advisor schema
GRANT USAGE ON SCHEMA index_advisor TO monitoring_role;
GRANT ALL ON ALL TABLES IN SCHEMA index_advisor TO monitoring_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA index_advisor TO monitoring_role;

-- Function to analyze and recommend indexes
CREATE OR REPLACE FUNCTION index_advisor.recommend_indexes()
RETURNS TABLE (
    table_name text,
    column_names text[],
    index_type text,
    reason text,
    estimated_improvement numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clear existing hypothetical indexes
    PERFORM hypopg_reset();
    
    RETURN QUERY
    WITH slow_queries AS (
        SELECT query, mean_exec_time + mean_plan_time as mean_time, calls
        FROM pg_stat_statements
        WHERE mean_exec_time + mean_plan_time > 1000  -- queries taking more than 1 second
        AND query ~* 'select'  -- only analyze SELECT queries for now
    ),
    table_scans AS (
        SELECT schemaname, relname, seq_scan, seq_tup_read,
               idx_scan, idx_tup_fetch
        FROM pg_stat_user_tables
        WHERE seq_scan > 0
    ),
    missing_indexes AS (
        SELECT DISTINCT
            t.relname as table_name,
            array_agg(a.attname) as column_names,
            'btree' as index_type,
            'High number of sequential scans detected' as reason,
            (t.seq_tup_read::numeric / NULLIF(t.seq_scan, 0)) as estimated_improvement
        FROM table_scans t
        JOIN pg_attribute a ON a.attrelid = t.relname::regclass
        WHERE t.seq_scan > t.idx_scan  -- more sequential scans than index scans
        AND a.attnum > 0  -- exclude system columns
        AND NOT EXISTS (  -- exclude columns that are already indexed
            SELECT 1
            FROM pg_index i
            JOIN pg_attribute ia ON ia.attrelid = i.indrelid
            WHERE i.indrelid = t.relname::regclass
            AND ia.attnum = ANY(i.indkey)
            AND ia.attnum = a.attnum
        )
        GROUP BY t.relname, t.seq_scan, t.seq_tup_read
        HAVING count(*) > 0
    )
    SELECT *
    FROM missing_indexes
    ORDER BY estimated_improvement DESC;
END;
$$;

-- Grant execute permission on the advisor function
GRANT EXECUTE ON FUNCTION index_advisor.recommend_indexes() TO monitoring_role;

-- Function to implement recommended indexes
CREATE OR REPLACE FUNCTION index_advisor.implement_index(
    p_table_name text,
    p_column_names text[],
    p_index_type text DEFAULT 'btree'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_index_name text;
    v_sql text;
BEGIN
    -- Generate a unique index name
    v_index_name := 'idx_' || p_table_name || '_' || 
                    array_to_string(p_column_names, '_');
                    
    -- Create the index
    v_sql := format(
        'CREATE INDEX IF NOT EXISTS %I ON %I USING %s (%s)',
        v_index_name,
        p_table_name,
        p_index_type,
        array_to_string(p_column_names, ', ')
    );
    
    EXECUTE v_sql;
    
    -- Update the recommendations table
    UPDATE index_advisor.recommendations
    SET is_implemented = true,
        implemented_at = now()
    WHERE table_name = p_table_name
    AND column_names = p_column_names
    AND index_type = p_index_type
    AND is_implemented = false;
    
    RETURN 'Created index ' || v_index_name;
END;
$$;

-- Grant execute permission on the implementation function
GRANT EXECUTE ON FUNCTION index_advisor.implement_index(text, text[], text) TO monitoring_role; 