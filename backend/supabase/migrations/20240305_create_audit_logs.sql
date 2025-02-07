-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs (resource_type);

-- Add RLS policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with the 'audit' role can read audit logs
CREATE POLICY "Read audit logs with audit role"
    ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'audit'
    );

-- Only the service role can insert audit logs
CREATE POLICY "Insert audit logs with service role"
    ON audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Create audit_metrics view for dashboard
CREATE OR REPLACE VIEW audit_metrics AS
SELECT
    date_trunc('hour', created_at) as time_bucket,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_type LIKE '%FAILURE%') as failure_events,
    COUNT(*) FILTER (WHERE event_type = 'AUTH_SUCCESS') as auth_successes,
    COUNT(*) FILTER (WHERE event_type = 'AUTH_FAILURE') as auth_failures,
    COUNT(*) FILTER (WHERE event_type = 'SECURITY_ALERT') as security_alerts,
    COUNT(*) FILTER (WHERE event_type = 'RATE_LIMIT') as rate_limit_events,
    COUNT(*) FILTER (WHERE event_type LIKE 'SESSION_%') as session_events,
    COUNT(*) FILTER (WHERE event_type = 'DATA_ACCESS') as data_access_events
FROM audit_logs
GROUP BY time_bucket
ORDER BY time_bucket DESC; 