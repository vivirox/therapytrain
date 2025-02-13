-- Function to list user tables
CREATE OR REPLACE FUNCTION system_list_tables()
RETURNS TABLE (
    table_name text,
    total_rows bigint,
    total_size bigint,
    total_size_pretty text
) SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || relname as table_name,
        n_live_tup as total_rows,
        pg_total_relation_size(schemaname || '.' || relname) as total_size,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as total_size_pretty
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION system_table_stats(table_name text)
RETURNS TABLE (
    n_live_tup bigint,
    n_dead_tup bigint,
    total_size bigint,
    total_size_pretty text,
    index_size bigint,
    index_size_pretty text
) SECURITY DEFINER
AS $$
DECLARE
    v_schema text;
    v_table text;
BEGIN
    -- Split schema and table name
    SELECT split_part(table_name, '.', 1), split_part(table_name, '.', 2)
    INTO v_schema, v_table;

    -- If no schema specified, assume public
    IF v_table = '' THEN
        v_table := v_schema;
        v_schema := 'public';
    END IF;

    RETURN QUERY
    SELECT
        s.n_live_tup,
        s.n_dead_tup,
        pg_total_relation_size(table_name::regclass) as total_size,
        pg_size_pretty(pg_total_relation_size(table_name::regclass)) as total_size_pretty,
        pg_indexes_size(table_name::regclass) as index_size,
        pg_size_pretty(pg_indexes_size(table_name::regclass)) as index_size_pretty
    FROM pg_stat_user_tables s
    WHERE s.schemaname = v_schema
    AND s.relname = v_table;
END;
$$ LANGUAGE plpgsql;

-- Function to vacuum a table
CREATE OR REPLACE FUNCTION system_vacuum_table(table_name text)
RETURNS void SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format('VACUUM ANALYZE %I', table_name);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION system_list_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION system_table_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION system_vacuum_table(text) TO authenticated; 