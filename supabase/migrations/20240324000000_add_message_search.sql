-- Create custom text search configuration for chat messages
CREATE TEXT SEARCH CONFIGURATION chat_message_config (
    COPY = english
);

-- Add custom dictionary for therapy-specific terms (can be extended later)
CREATE TEXT SEARCH DICTIONARY therapy_dict (
    TEMPLATE = synonym,
    SYNONYMS = therapy_terms
);

-- Create therapy terms file (placeholder, to be populated with domain-specific terms)
CREATE TABLE therapy_terms (
    word text PRIMARY KEY,
    synonyms text[]
);

-- Add therapy dictionary to configuration
ALTER TEXT SEARCH CONFIGURATION chat_message_config
    ALTER MAPPING FOR asciiword, word, numword
    WITH therapy_dict, english_stem;

-- Add search vector column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('chat_message_config', COALESCE(content, '')), 'A') ||
    setweight(to_tsvector('chat_message_config', COALESCE(metadata->>'intent', '')), 'B') ||
    setweight(to_tsvector('chat_message_config', COALESCE(metadata->>'entities'::text, '')), 'C')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_messages_search_vector
ON messages USING GIN (search_vector);

-- Create search results view with highlighting and ranking
CREATE OR REPLACE VIEW message_search_results AS
SELECT 
    m.id,
    m.thread_id,
    m.content,
    m.created_at,
    m.sender_id,
    ts_headline('chat_message_config', m.content, q.query) as highlighted_content,
    ts_rank_cd(m.search_vector, q.query) as rank,
    -- Get messages before and after for context
    LAG(m.content, 1) OVER (PARTITION BY m.thread_id ORDER BY m.created_at) as previous_message,
    LEAD(m.content, 1) OVER (PARTITION BY m.thread_id ORDER BY m.created_at) as next_message
FROM 
    messages m,
    to_tsquery('chat_message_config', 'query_placeholder') as q
WHERE 
    m.search_vector @@ q.query;

-- Create search audit logging
CREATE TABLE IF NOT EXISTS search_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    thread_id UUID NOT NULL REFERENCES chat_threads(id),
    query TEXT NOT NULL,
    result_count INTEGER,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Enable RLS on search audit logs
ALTER TABLE search_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for search audit logs
CREATE POLICY "Users can view their own search logs"
    ON search_audit_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create search statistics materialized view
CREATE MATERIALIZED VIEW search_statistics AS
SELECT
    user_id,
    thread_id,
    DATE_TRUNC('hour', created_at) as time_bucket,
    COUNT(*) as search_count,
    AVG(result_count) as avg_results,
    AVG(execution_time_ms) as avg_execution_time,
    array_agg(DISTINCT query) as queries
FROM search_audit_logs
GROUP BY user_id, thread_id, DATE_TRUNC('hour', created_at);

-- Create index for search statistics
CREATE UNIQUE INDEX idx_search_statistics
ON search_statistics(user_id, thread_id, time_bucket);

-- Create function to refresh search statistics
CREATE OR REPLACE FUNCTION refresh_search_statistics()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY search_statistics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh search statistics
CREATE TRIGGER refresh_search_statistics_trigger
    AFTER INSERT ON search_audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_search_statistics();

-- Add comments for documentation
COMMENT ON TEXT SEARCH CONFIGURATION chat_message_config IS 'Custom text search configuration for chat messages with therapy-specific terms';
COMMENT ON TABLE therapy_terms IS 'Dictionary of therapy-specific terms and their synonyms for improved search relevance';
COMMENT ON COLUMN messages.search_vector IS 'Weighted tsvector for full-text search with content, intent, and entities';
COMMENT ON VIEW message_search_results IS 'Search results view with highlighting, ranking, and message context';
COMMENT ON TABLE search_audit_logs IS 'Audit trail for message search operations';
COMMENT ON MATERIALIZED VIEW search_statistics IS 'Aggregated search statistics for monitoring and optimization'; 