-- Create failed_messages table
CREATE TABLE IF NOT EXISTS failed_messages (
    message_id UUID PRIMARY KEY REFERENCES messages(id),
    thread_id UUID NOT NULL REFERENCES chat_threads(id),
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    recipient_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN ('failed', 'recovered')),
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_failed_messages_thread_id ON failed_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_failed_messages_status ON failed_messages(status);
CREATE INDEX IF NOT EXISTS idx_failed_messages_sender_id ON failed_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_failed_messages_recipient_id ON failed_messages(recipient_id);

-- Add RLS policies
ALTER TABLE failed_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own failed messages (as sender or recipient)
CREATE POLICY "Users can view their own failed messages"
    ON failed_messages
    FOR SELECT
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = recipient_id
    );

-- Allow system to insert failed messages
CREATE POLICY "System can insert failed messages"
    ON failed_messages
    FOR INSERT
    WITH CHECK (true);

-- Allow system to update failed messages
CREATE POLICY "System can update failed messages"
    ON failed_messages
    FOR UPDATE
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_failed_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_failed_messages_updated_at
    BEFORE UPDATE ON failed_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_failed_messages_updated_at(); 