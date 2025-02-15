-- Add indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions (client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_id ON sessions (therapist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_composite_client_status ON sessions (client_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_composite_therapist_status ON sessions (therapist_id, status);

-- Add indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_composite_user_email ON profiles (user_id, email);

-- Add indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_composite_session_created ON messages (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_composite_user_created ON messages (user_id, created_at DESC);

-- Add partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_active_sessions ON sessions (created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_completed_sessions ON sessions (created_at DESC) WHERE status = 'completed';

-- Create a function to check if a message is recent (within last 24 hours)
CREATE OR REPLACE FUNCTION is_recent_message(created_at TIMESTAMPTZ)
RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
    SELECT created_at > '2024-01-01'::timestamptz
$$;

-- Add partial index for recent messages using the immutable function
CREATE INDEX IF NOT EXISTS idx_recent_messages ON messages (created_at DESC) 
WHERE is_recent_message(created_at);

-- Add GiST index for text search on messages
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING GiST (to_tsvector('english', content));

-- Rollback SQL
-- DROP INDEX IF EXISTS idx_sessions_client_id;
-- DROP INDEX IF EXISTS idx_sessions_therapist_id;
-- DROP INDEX IF EXISTS idx_sessions_status;
-- DROP INDEX IF EXISTS idx_sessions_created_at;
-- DROP INDEX IF EXISTS idx_sessions_composite_client_status;
-- DROP INDEX IF EXISTS idx_sessions_composite_therapist_status;
-- DROP INDEX IF EXISTS idx_profiles_user_id;
-- DROP INDEX IF EXISTS idx_profiles_email;
-- DROP INDEX IF EXISTS idx_profiles_updated_at;
-- DROP INDEX IF EXISTS idx_profiles_composite_user_email;
-- DROP INDEX IF EXISTS idx_messages_session_id;
-- DROP INDEX IF EXISTS idx_messages_user_id;
-- DROP INDEX IF EXISTS idx_messages_created_at;
-- DROP INDEX IF EXISTS idx_messages_composite_session_created;
-- DROP INDEX IF EXISTS idx_messages_composite_user_created;
-- DROP INDEX IF EXISTS idx_active_sessions;
-- DROP INDEX IF EXISTS idx_completed_sessions;
-- DROP INDEX IF EXISTS idx_recent_messages;
-- DROP INDEX IF EXISTS idx_messages_content_search; 