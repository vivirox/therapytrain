-- Create thread events table
CREATE TABLE thread_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_event_type CHECK (
        event_type IN (
            'thread_created',
            'thread_deleted',
            'message_sent',
            'participant_joined',
            'participant_left'
        )
    )
);

-- Create thread metrics table
CREATE TABLE thread_metrics (
    thread_id UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL,
    message_count INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0,
    active_participants INTEGER DEFAULT 0,
    average_response_time FLOAT DEFAULT 0,
    depth INTEGER DEFAULT 0,
    branch_count INTEGER DEFAULT 0,
    engagement_score FLOAT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create thread performance table
CREATE TABLE thread_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    load_time FLOAT NOT NULL,
    message_latency FLOAT NOT NULL,
    cache_hit_rate FLOAT NOT NULL,
    error_rate FLOAT NOT NULL,
    cpu_usage FLOAT NOT NULL,
    memory_usage FLOAT NOT NULL,
    network_usage FLOAT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_rates CHECK (
        cache_hit_rate BETWEEN 0 AND 1 AND
        error_rate BETWEEN 0 AND 1
    )
);

-- Create thread trends table
CREATE TABLE thread_trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    message_volume INTEGER NOT NULL,
    participant_activity INTEGER NOT NULL,
    response_times FLOAT[] NOT NULL,
    error_count INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_thread_events_thread_id ON thread_events(thread_id);
CREATE INDEX idx_thread_events_user_id ON thread_events(user_id);
CREATE INDEX idx_thread_events_created_at ON thread_events(created_at);
CREATE INDEX idx_thread_performance_thread_id ON thread_performance(thread_id);
CREATE INDEX idx_thread_performance_timestamp ON thread_performance(timestamp);
CREATE INDEX idx_thread_trends_thread_id ON thread_trends(thread_id);
CREATE INDEX idx_thread_trends_timestamp ON thread_trends(timestamp);

-- Add RLS policies
ALTER TABLE thread_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_trends ENABLE ROW LEVEL SECURITY;

-- Create policies for thread events
CREATE POLICY "Thread events are viewable by thread participants"
    ON thread_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM thread_participants
            WHERE thread_participants.thread_id = thread_events.thread_id
            AND thread_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Thread events are insertable by thread participants"
    ON thread_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM thread_participants
            WHERE thread_participants.thread_id = thread_events.thread_id
            AND thread_participants.user_id = auth.uid()
        )
    );

-- Create policies for thread metrics
CREATE POLICY "Thread metrics are viewable by thread participants"
    ON thread_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM thread_participants
            WHERE thread_participants.thread_id = thread_metrics.thread_id
            AND thread_participants.user_id = auth.uid()
        )
    );

-- Create policies for thread performance
CREATE POLICY "Thread performance is viewable by thread participants"
    ON thread_performance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM thread_participants
            WHERE thread_participants.thread_id = thread_performance.thread_id
            AND thread_participants.user_id = auth.uid()
        )
    );

-- Create policies for thread trends
CREATE POLICY "Thread trends are viewable by thread participants"
    ON thread_trends FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM thread_participants
            WHERE thread_participants.thread_id = thread_trends.thread_id
            AND thread_participants.user_id = auth.uid()
        )
    );

-- Create function to update thread metrics
CREATE OR REPLACE FUNCTION update_thread_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE thread_metrics
    SET 
        message_count = message_count + 1,
        last_activity = NOW(),
        updated_at = NOW()
    WHERE thread_id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating thread metrics
CREATE TRIGGER update_thread_metrics_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_metrics(); 