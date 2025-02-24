-- Add columns for forward secrecy
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS iv TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS proof TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS message_number INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS previous_chain_length INTEGER NOT NULL DEFAULT 0;

-- Add index for message ordering
CREATE INDEX IF NOT EXISTS idx_messages_message_number 
ON messages(thread_id, message_number);

-- Create table for ratchet states
CREATE TABLE IF NOT EXISTS ratchet_states (
    thread_id UUID PRIMARY KEY REFERENCES chat_threads(id),
    root_key TEXT NOT NULL,
    sending_chain_key TEXT NOT NULL,
    receiving_chain_key TEXT NOT NULL,
    sending_ratchet_private_key TEXT NOT NULL,
    receiving_ratchet_public_key TEXT NOT NULL,
    previous_ratchet_public_keys TEXT[] NOT NULL DEFAULT '{}',
    message_numbers JSONB NOT NULL DEFAULT '{}',
    skipped_message_keys JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for ratchet states
ALTER TABLE ratchet_states ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own ratchet states
CREATE POLICY "Users can view their own ratchet states"
    ON ratchet_states
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads
            WHERE chat_threads.id = ratchet_states.thread_id
            AND (
                chat_threads.sender_id = auth.uid() OR
                chat_threads.recipient_id = auth.uid()
            )
        )
    );

-- Allow system to insert and update ratchet states
CREATE POLICY "System can insert ratchet states"
    ON ratchet_states
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can update ratchet states"
    ON ratchet_states
    FOR UPDATE
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ratchet_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ratchet_states_updated_at
    BEFORE UPDATE ON ratchet_states
    FOR EACH ROW
    EXECUTE FUNCTION update_ratchet_states_updated_at(); 