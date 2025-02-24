-- Test data setup
BEGIN;

-- Insert test data
INSERT INTO threads (id, created_at, status) VALUES
    ('test-thread-1', NOW() - INTERVAL '1 day', 'active'),
    ('test-thread-2', NOW() - INTERVAL '2 days', 'active');

INSERT INTO thread_events (thread_id, user_id, event_type, created_at) VALUES
    ('test-thread-1', 'user1', 'thread_created', NOW() - INTERVAL '1 day'),
    ('test-thread-1', 'user2', 'message_sent', NOW() - INTERVAL '12 hours'),
    ('test-thread-2', 'user1', 'thread_created', NOW() - INTERVAL '2 days'),
    ('test-thread-2', 'user3', 'participant_joined', NOW() - INTERVAL '1 day');

INSERT INTO thread_metrics (
    thread_id, created_at, last_activity, message_count,
    participant_count, active_participants, average_response_time,
    depth, branch_count, engagement_score
) VALUES
    ('test-thread-1', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour',
     10, 3, 2, 2000, 3, 2, 75.5),
    ('test-thread-2', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 hours',
     20, 4, 3, 1800, 4, 3, 82.5);

INSERT INTO thread_performance (
    thread_id, load_time, message_latency, cache_hit_rate,
    error_rate, cpu_usage, memory_usage, network_usage
) VALUES
    ('test-thread-1', 800, 200, 0.85, 0.01, 0.6, 0.7, 0.4),
    ('test-thread-2', 750, 180, 0.90, 0.005, 0.5, 0.6, 0.3);

INSERT INTO thread_trends (
    thread_id, timestamp, message_volume, participant_activity,
    response_times, error_count
) VALUES
    ('test-thread-1', NOW() - INTERVAL '2 hours', 5, 2, ARRAY[1800, 2000, 1900], 1),
    ('test-thread-1', NOW() - INTERVAL '1 hour', 7, 3, ARRAY[1700, 1800, 1600], 0),
    ('test-thread-2', NOW() - INTERVAL '3 hours', 8, 3, ARRAY[1600, 1700, 1500], 1),
    ('test-thread-2', NOW() - INTERVAL '2 hours', 10, 4, ARRAY[1500, 1600, 1400], 0);

-- Test materialized views
REFRESH MATERIALIZED VIEW thread_activity_summary;
REFRESH MATERIALIZED VIEW thread_hourly_trends;

-- Test thread_activity_summary view
DO $$
BEGIN
    -- Verify thread metrics are correctly aggregated
    ASSERT EXISTS (
        SELECT 1 FROM thread_activity_summary
        WHERE thread_id = 'test-thread-1'
        AND message_count = 10
        AND participant_count = 3
        AND active_participants = 2
    ), 'Thread activity summary should contain correct metrics';

    -- Verify performance metrics are included
    ASSERT EXISTS (
        SELECT 1 FROM thread_activity_summary
        WHERE thread_id = 'test-thread-1'
        AND load_time = 800
        AND message_latency = 200
        AND cache_hit_rate = 0.85
    ), 'Thread activity summary should contain performance metrics';

    -- Verify recent events are aggregated
    ASSERT EXISTS (
        SELECT 1 FROM thread_activity_summary
        WHERE thread_id = 'test-thread-1'
        AND recent_events IS NOT NULL
    ), 'Thread activity summary should contain recent events';
END $$;

-- Test thread_hourly_trends view
DO $$
BEGIN
    -- Verify hourly aggregation
    ASSERT EXISTS (
        SELECT 1 FROM thread_hourly_trends
        WHERE thread_id = 'test-thread-1'
        AND avg_message_volume > 0
        AND avg_participant_activity > 0
        AND avg_response_time > 0
    ), 'Hourly trends should contain aggregated metrics';

    -- Verify sample counts
    ASSERT EXISTS (
        SELECT 1 FROM thread_hourly_trends
        WHERE thread_id = 'test-thread-1'
        AND sample_count > 0
    ), 'Hourly trends should track sample counts';
END $$;

-- Test indexes
DO $$
DECLARE
    idx_exists boolean;
BEGIN
    -- Test composite indexes
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_thread_events_type_timestamp'
    ) INTO idx_exists;
    ASSERT idx_exists, 'Thread events type/timestamp index should exist';

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_thread_events_user_thread'
    ) INTO idx_exists;
    ASSERT idx_exists, 'Thread events user/thread index should exist';

    -- Test materialized view indexes
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_thread_activity_summary_thread_id'
    ) INTO idx_exists;
    ASSERT idx_exists, 'Thread activity summary index should exist';

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_thread_hourly_trends_composite'
    ) INTO idx_exists;
    ASSERT idx_exists, 'Thread hourly trends index should exist';

    -- Test partial indexes
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_thread_metrics_active'
    ) INTO idx_exists;
    ASSERT idx_exists, 'Active thread metrics index should exist';

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_thread_performance_active'
    ) INTO idx_exists;
    ASSERT idx_exists, 'Active thread performance index should exist';
END $$;

-- Test cleanup function
DO $$
BEGIN
    -- Insert old data
    INSERT INTO thread_events (thread_id, user_id, event_type, created_at)
    VALUES ('test-thread-1', 'user1', 'message_sent', NOW() - INTERVAL '60 days');

    -- Run cleanup
    PERFORM cleanup_old_analytics_data(30);

    -- Verify old data is removed
    ASSERT NOT EXISTS (
        SELECT 1 FROM thread_events
        WHERE created_at < NOW() - INTERVAL '30 days'
    ), 'Old events should be cleaned up';
END $$;

-- Test statistics gathering
DO $$
BEGIN
    -- Run statistics gathering
    PERFORM gather_thread_analytics_stats();

    -- Verify statistics are gathered (check pg_stat_user_tables)
    ASSERT EXISTS (
        SELECT 1 FROM pg_stat_user_tables
        WHERE relname IN (
            'thread_events',
            'thread_metrics',
            'thread_performance',
            'thread_trends'
        )
        AND last_analyze IS NOT NULL
    ), 'Statistics should be gathered for analytics tables';
END $$;

ROLLBACK; 