-- Add composite indexes for common query patterns
CREATE INDEX idx_thread_events_type_timestamp ON thread_events(event_type, created_at);
CREATE INDEX idx_thread_events_user_thread ON thread_events(user_id, thread_id);
CREATE INDEX idx_thread_metrics_activity ON thread_metrics(last_activity DESC);
CREATE INDEX idx_thread_performance_metrics ON thread_performance(thread_id, timestamp DESC);
CREATE INDEX idx_thread_trends_analysis ON thread_trends(thread_id, timestamp DESC);

-- Create materialized view for thread activity summary
CREATE MATERIALIZED VIEW thread_activity_summary AS
SELECT
    t.thread_id,
    t.created_at,
    t.last_activity,
    t.message_count,
    t.participant_count,
    t.active_participants,
    t.average_response_time,
    t.depth,
    t.branch_count,
    t.engagement_score,
    p.load_time,
    p.message_latency,
    p.cache_hit_rate,
    p.error_rate,
    p.cpu_usage,
    p.memory_usage,
    p.network_usage,
    p.timestamp as performance_timestamp,
    (
        SELECT json_agg(json_build_object(
            'type', tr.event_type,
            'count', tr.event_count,
            'timestamp', tr.event_timestamp
        ))
        FROM (
            SELECT 
                event_type,
                COUNT(*) as event_count,
                date_trunc('hour', created_at) as event_timestamp
            FROM thread_events
            WHERE thread_id = t.thread_id
            GROUP BY event_type, date_trunc('hour', created_at)
            ORDER BY event_timestamp DESC
            LIMIT 24
        ) tr
    ) as recent_events
FROM thread_metrics t
LEFT JOIN LATERAL (
    SELECT *
    FROM thread_performance
    WHERE thread_id = t.thread_id
    ORDER BY timestamp DESC
    LIMIT 1
) p ON true;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_thread_activity_summary_thread_id 
ON thread_activity_summary(thread_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_thread_activity_summary()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY thread_activity_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh materialized view
CREATE TRIGGER refresh_activity_summary_on_metrics
    AFTER INSERT OR UPDATE OR DELETE ON thread_metrics
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_thread_activity_summary();

CREATE TRIGGER refresh_activity_summary_on_performance
    AFTER INSERT OR UPDATE OR DELETE ON thread_performance
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_thread_activity_summary();

-- Create materialized view for hourly trends
CREATE MATERIALIZED VIEW thread_hourly_trends AS
SELECT
    thread_id,
    date_trunc('hour', timestamp) as hour,
    AVG(message_volume) as avg_message_volume,
    AVG(participant_activity) as avg_participant_activity,
    AVG(array_to_string(response_times, ',')::decimal) as avg_response_time,
    SUM(error_count) as total_errors,
    COUNT(*) as sample_count
FROM thread_trends
GROUP BY thread_id, date_trunc('hour', timestamp);

-- Create indexes on hourly trends
CREATE UNIQUE INDEX idx_thread_hourly_trends_composite
ON thread_hourly_trends(thread_id, hour);

-- Create function to refresh hourly trends
CREATE OR REPLACE FUNCTION refresh_thread_hourly_trends()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY thread_hourly_trends;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh hourly trends
CREATE TRIGGER refresh_hourly_trends
    AFTER INSERT OR UPDATE OR DELETE ON thread_trends
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_thread_hourly_trends();

-- Create function to cleanup old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data(retention_days integer)
RETURNS void AS $$
BEGIN
    -- Delete old events
    DELETE FROM thread_events
    WHERE created_at < NOW() - (retention_days || ' days')::interval;
    
    -- Delete old performance metrics
    DELETE FROM thread_performance
    WHERE timestamp < NOW() - (retention_days || ' days')::interval;
    
    -- Delete old trends
    DELETE FROM thread_trends
    WHERE timestamp < NOW() - (retention_days || ' days')::interval;
    
    -- Refresh materialized views after cleanup
    REFRESH MATERIALIZED VIEW CONCURRENTLY thread_activity_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY thread_hourly_trends;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (runs daily at midnight)
SELECT cron.schedule(
    'cleanup-analytics-data',
    '0 0 * * *',
    $$SELECT cleanup_old_analytics_data(30)$$
);

-- Optimize the thread metrics update trigger
CREATE OR REPLACE FUNCTION update_thread_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO thread_metrics (
        thread_id,
        created_at,
        last_activity,
        message_count,
        participant_count,
        active_participants,
        average_response_time,
        depth,
        branch_count,
        engagement_score,
        updated_at
    )
    VALUES (
        NEW.thread_id,
        (SELECT created_at FROM threads WHERE id = NEW.thread_id),
        NOW(),
        1,
        (SELECT COUNT(DISTINCT user_id) FROM thread_participants WHERE thread_id = NEW.thread_id),
        (SELECT COUNT(DISTINCT user_id) FROM thread_participants 
         WHERE thread_id = NEW.thread_id 
         AND last_activity > NOW() - INTERVAL '15 minutes'),
        0,
        1,
        0,
        0,
        NOW()
    )
    ON CONFLICT (thread_id) DO UPDATE SET
        last_activity = NOW(),
        message_count = thread_metrics.message_count + 1,
        participant_count = EXCLUDED.participant_count,
        active_participants = EXCLUDED.active_participants,
        updated_at = NOW();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add partial indexes for active threads
CREATE INDEX idx_thread_metrics_active ON thread_metrics(thread_id)
WHERE last_activity > NOW() - INTERVAL '24 hours';

CREATE INDEX idx_thread_performance_active ON thread_performance(thread_id, timestamp)
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Add statistics gathering
CREATE OR REPLACE FUNCTION gather_thread_analytics_stats()
RETURNS void AS $$
BEGIN
    ANALYZE thread_events;
    ANALYZE thread_metrics;
    ANALYZE thread_performance;
    ANALYZE thread_trends;
    ANALYZE thread_activity_summary;
    ANALYZE thread_hourly_trends;
END;
$$ LANGUAGE plpgsql;

-- Schedule statistics gathering (runs daily at 2 AM)
SELECT cron.schedule(
    'gather-analytics-stats',
    '0 2 * * *',
    $$SELECT gather_thread_analytics_stats()$$
); 