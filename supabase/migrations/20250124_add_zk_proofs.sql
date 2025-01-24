-- Add ZK proof columns to therapy_sessions table
ALTER TABLE therapy_sessions
ADD COLUMN session_proof text,
ADD COLUMN public_signals jsonb,
ADD COLUMN metrics_proof text;

-- Create index for faster proof verification
CREATE INDEX idx_therapy_sessions_session_proof ON therapy_sessions (session_proof);
CREATE INDEX idx_therapy_sessions_metrics_proof ON therapy_sessions (metrics_proof);

-- Create function to verify session integrity
CREATE OR REPLACE FUNCTION verify_session_integrity(session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record record;
    expected_hash text;
BEGIN
    -- Get the session record
    SELECT * INTO session_record
    FROM therapy_sessions
    WHERE id = session_id;

    -- Verify the proof exists
    IF session_record.session_proof IS NULL OR session_record.public_signals IS NULL THEN
        RETURN false;
    END IF;

    -- In production, this would use proper ZK verification
    -- For development, we verify the hash-based commitment
    SELECT encode(sha256(
        session_record.public_signals->>'sessionId' || '|' ||
        session_record.public_signals->>'timestamp' || '|' ||
        session_record.public_signals->>'durationMinutes' || '|' ||
        session_record.public_signals->>'clientDataHash' || '|' ||
        session_record.public_signals->>'metricsHash' || '|' ||
        session_record.public_signals->>'therapistId'
    )::bytea, 'hex') INTO expected_hash;

    RETURN session_record.session_proof = expected_hash;
END;
$$;

-- Create function to verify metrics proof
CREATE OR REPLACE FUNCTION verify_metrics_proof(session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record record;
BEGIN
    -- Get the metrics proof for the session
    SELECT metrics_proof INTO session_record
    FROM therapy_sessions
    WHERE id = session_id;

    -- For development, we just verify the proof exists
    -- In production, this would verify the ZK proof
    RETURN session_record.metrics_proof IS NOT NULL;
END;
$$;

-- Create policy to ensure proofs exist for completed sessions
CREATE POLICY ensure_proofs_exist ON therapy_sessions
    FOR UPDATE
    USING (
        CASE 
            WHEN NEW.status = 'completed' THEN 
                NEW.session_proof IS NOT NULL AND 
                NEW.metrics_proof IS NOT NULL AND
                verify_session_integrity(NEW.id)
            ELSE true
        END
    );

-- Create function to generate session summary with proof verification
CREATE OR REPLACE FUNCTION get_session_summary(session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    summary jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'start_time', start_time,
        'end_time', end_time,
        'status', status,
        'integrity_verified', verify_session_integrity(id),
        'metrics_verified', verify_metrics_proof(id),
        'public_signals', public_signals
    ) INTO summary
    FROM therapy_sessions
    WHERE id = session_id;

    RETURN summary;
END;
$$;
