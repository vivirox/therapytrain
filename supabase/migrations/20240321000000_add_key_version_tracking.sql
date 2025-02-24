-- Add key version tracking to failed_messages table
ALTER TABLE failed_messages
ADD COLUMN IF NOT EXISTS encryption_key_version TEXT NOT NULL DEFAULT 'current',
ADD COLUMN IF NOT EXISTS encryption_key_id UUID,
ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

-- Add index for key version queries
CREATE INDEX IF NOT EXISTS idx_failed_messages_key_version 
ON failed_messages(encryption_key_version);

-- Update the failed_messages type to include transition state
ALTER TABLE failed_messages 
DROP CONSTRAINT IF EXISTS failed_messages_status_check;

ALTER TABLE failed_messages 
ADD CONSTRAINT failed_messages_status_check 
CHECK (status IN ('failed', 'recovered', 'transition_pending', 'transition_failed'));

-- Add function to track key version changes
CREATE OR REPLACE FUNCTION track_key_version_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.encryption_key_version != OLD.encryption_key_version THEN
        NEW.updated_at = NOW();
        NEW.encryption_metadata = jsonb_set(
            COALESCE(OLD.encryption_metadata, '{}'::jsonb),
            '{key_transitions}',
            COALESCE(
                OLD.encryption_metadata->'key_transitions', '[]'::jsonb
            ) || jsonb_build_object(
                'from_version', OLD.encryption_key_version,
                'to_version', NEW.encryption_key_version,
                'timestamp', extract(epoch from NOW())
            )::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for key version tracking
CREATE TRIGGER track_key_version_changes
    BEFORE UPDATE ON failed_messages
    FOR EACH ROW
    WHEN (NEW.encryption_key_version IS DISTINCT FROM OLD.encryption_key_version)
    EXECUTE FUNCTION track_key_version_change();

-- Add comment for documentation
COMMENT ON TABLE failed_messages IS 'Stores failed messages with encryption key version tracking for recovery during key rotation periods'; 