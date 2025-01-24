-- Create enum for audit event types
CREATE TYPE audit_event_type AS ENUM (
    'SECURITY',
    'ACCESS',
    'DATA',
    'PROOF',
    'SYSTEM'
);

-- Create audit logs table
CREATE TABLE audit_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type audit_event_type NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    session_id uuid REFERENCES therapy_sessions(id),
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    action text NOT NULL,
    status text NOT NULL CHECK (status IN ('success', 'failure')),
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING gin (metadata);

-- Create view for security events
CREATE VIEW security_audit_view AS
SELECT 
    id,
    event_type,
    user_id,
    session_id,
    action,
    status,
    details,
    metadata->>'ip' as ip_address,
    metadata->>'userAgent' as user_agent,
    metadata->>'timestamp' as event_timestamp,
    created_at
FROM audit_logs
WHERE event_type = 'SECURITY'
ORDER BY created_at DESC;

-- Create view for proof verification events
CREATE VIEW proof_audit_view AS
SELECT 
    id,
    session_id,
    action,
    status,
    details,
    metadata->>'proofId' as proof_id,
    metadata->>'timestamp' as event_timestamp,
    created_at
FROM audit_logs
WHERE event_type = 'PROOF'
ORDER BY created_at DESC;

-- Create function to get session audit trail
CREATE OR REPLACE FUNCTION get_session_audit_trail(p_session_id uuid)
RETURNS TABLE (
    event_type audit_event_type,
    action text,
    status text,
    details jsonb,
    event_timestamp timestamptz,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.event_type,
        a.action,
        a.status,
        a.details,
        (a.metadata->>'timestamp')::timestamptz as event_timestamp,
        a.metadata
    FROM audit_logs a
    WHERE a.session_id = p_session_id
    ORDER BY (a.metadata->>'timestamp')::timestamptz DESC;
END;
$$;

-- Create function to get security events in date range
CREATE OR REPLACE FUNCTION get_security_events(
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS TABLE (
    id uuid,
    action text,
    status text,
    details jsonb,
    ip_address text,
    user_agent text,
    event_timestamp timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.action,
        a.status,
        a.details,
        a.metadata->>'ip' as ip_address,
        a.metadata->>'userAgent' as user_agent,
        (a.metadata->>'timestamp')::timestamptz as event_timestamp
    FROM audit_logs a
    WHERE 
        a.event_type = 'SECURITY'
        AND (a.metadata->>'timestamp')::timestamptz BETWEEN p_start_date AND p_end_date
    ORDER BY (a.metadata->>'timestamp')::timestamptz DESC;
END;
$$;

-- Create policy to prevent audit log modification
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        CASE 
            WHEN current_user = 'service_role' THEN true
            WHEN current_user = 'authenticator' THEN true
            ELSE user_id = auth.uid()
        END
    );

-- Prevent updates and deletes
CREATE POLICY audit_logs_update ON audit_logs
    FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY audit_logs_delete ON audit_logs
    FOR DELETE
    TO authenticated
    USING (false);
