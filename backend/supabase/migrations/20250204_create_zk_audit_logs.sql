-- Create zk_audit_logs table
CREATE TABLE IF NOT EXISTS zk_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_zk_audit_logs_timestamp ON zk_audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_zk_audit_logs_type ON zk_audit_logs (type);
CREATE INDEX IF NOT EXISTS idx_zk_audit_logs_severity ON zk_audit_logs (severity);

-- Add RLS policies
ALTER TABLE zk_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with the 'audit' role can read audit logs
CREATE POLICY "Read audit logs with audit role"
    ON zk_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'audit'
    );

-- Only the service role can insert audit logs
CREATE POLICY "Insert audit logs with service role"
    ON zk_audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Create audit_metrics view for dashboard
CREATE OR REPLACE VIEW audit_metrics AS
SELECT
    date_trunc('hour', timestamp) as time_bucket,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE type LIKE '%ERROR%') as error_events,
    COUNT(*) FILTER (WHERE type = 'PROOF_CACHE_HIT') as cache_hits,
    COUNT(*) FILTER (WHERE type = 'PROOF_CACHE_MISS') as cache_misses,
    AVG(CASE 
        WHEN type = 'PROOF_GENERATED' 
        THEN (metadata->>'duration')::numeric 
    END) as avg_proof_time,
    AVG(CASE 
        WHEN type = 'PROOF_VERIFIED' 
        THEN (metadata->>'duration')::numeric 
    END) as avg_verification_time
FROM zk_audit_logs
GROUP BY time_bucket
ORDER BY time_bucket DESC;
