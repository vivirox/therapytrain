-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create session_keys table
CREATE TABLE IF NOT EXISTS session_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    thread_id UUID NOT NULL,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(thread_id, expires_at),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'expired')),
    previous_key_id UUID REFERENCES session_keys(id),
    rotation_started_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    thread_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    content TEXT NOT NULL,
    iv TEXT NOT NULL,
    proof TEXT NOT NULL,
    session_key_id UUID NOT NULL REFERENCES session_keys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    audit_metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
);

-- Create thread_participants table
CREATE TABLE IF NOT EXISTS thread_participants (
    thread_id UUID REFERENCES chat_threads(id),
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('therapist', 'client')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (thread_id, user_id)
);

-- Create audit_logs table for HIPAA compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation TEXT NOT NULL,
    user_id TEXT,
    thread_id UUID,
    message_id UUID,
    status TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_session_keys_thread_id ON session_keys(thread_id);
CREATE INDEX idx_session_keys_expires_at ON session_keys(expires_at);
CREATE INDEX idx_thread_participants_user_id ON thread_participants(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_thread_id ON audit_logs(thread_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_session_keys_status ON session_keys(thread_id, status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for chat_threads
CREATE TRIGGER update_chat_threads_updated_at
    BEFORE UPDATE ON chat_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for session_keys
CREATE TRIGGER update_session_keys_updated_at
    BEFORE UPDATE ON session_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_session_keys_updated_at();

-- Add RLS policies
ALTER TABLE session_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Session keys policies
CREATE POLICY "Session keys are only visible to thread participants"
    ON session_keys FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM thread_participants
        WHERE thread_participants.thread_id = session_keys.thread_id
        AND thread_participants.user_id = auth.uid()
    ));

-- Messages policies
CREATE POLICY "Messages are only visible to thread participants"
    ON messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM thread_participants
        WHERE thread_participants.thread_id = messages.thread_id
        AND thread_participants.user_id = auth.uid()
    ));

CREATE POLICY "Users can only insert messages in threads they participate in"
    ON messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM thread_participants
        WHERE thread_participants.thread_id = messages.thread_id
        AND thread_participants.user_id = auth.uid()
    ));

-- Chat threads policies
CREATE POLICY "Threads are only visible to participants"
    ON chat_threads FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM thread_participants
        WHERE thread_participants.thread_id = chat_threads.id
        AND thread_participants.user_id = auth.uid()
    ));

CREATE POLICY "Only therapists can create threads"
    ON chat_threads FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'therapist'
        )
    );

-- Thread participants policies
CREATE POLICY "Participants can see other participants in their threads"
    ON thread_participants FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM thread_participants AS tp
        WHERE tp.thread_id = thread_participants.thread_id
        AND tp.user_id = auth.uid()
    ));

-- Audit logs policies
CREATE POLICY "Audit logs are only visible to system admins"
    ON audit_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    ));

-- Add RLS policy for key rotation
CREATE POLICY "Allow key rotation for thread participants"
    ON session_keys FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM thread_participants
        WHERE thread_participants.thread_id = session_keys.thread_id
        AND thread_participants.user_id = auth.uid()
    )); 