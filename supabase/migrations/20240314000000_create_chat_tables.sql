-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    recipient_id UUID NOT NULL REFERENCES auth.users(id),
    encrypted_content TEXT NOT NULL,
    iv TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_keys table
CREATE TABLE user_keys (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    public_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_rotation TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create message_status table
CREATE TABLE message_status (
    message_id UUID REFERENCES messages(id),
    user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id)
);

-- Create typing_status table
CREATE TABLE typing_status (
    user_id UUID REFERENCES auth.users(id),
    chat_with UUID REFERENCES auth.users(id),
    is_typing BOOLEAN NOT NULL DEFAULT false,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, chat_with)
);

-- Add indexes
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_message_status_timestamp ON message_status(timestamp);
CREATE INDEX idx_typing_status_last_updated ON typing_status(last_updated);

-- Add RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can insert their own messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read messages they sent or received"
    ON messages FOR SELECT
    USING (auth.uid() IN (sender_id, recipient_id));

-- User keys policies
CREATE POLICY "Users can insert their own public key"
    ON user_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public key"
    ON user_keys FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public keys are readable by all authenticated users"
    ON user_keys FOR SELECT
    USING (auth.role() = 'authenticated');

-- Message status policies
CREATE POLICY "Users can update status of messages they received"
    ON message_status FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM messages
            WHERE id = message_id
            AND recipient_id = auth.uid()
        )
    );

CREATE POLICY "Users can read status of their messages"
    ON message_status FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages
            WHERE id = message_id
            AND (sender_id = auth.uid() OR recipient_id = auth.uid())
        )
    );

-- Typing status policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can update their typing status" ON typing_status;
    DROP POLICY IF EXISTS "Users can insert their typing status" ON typing_status;
    DROP POLICY IF EXISTS "Users can update their own typing status" ON typing_status;
    DROP POLICY IF EXISTS "Users can read typing status in their chats" ON typing_status;
END $$;

-- Create new policies
CREATE POLICY "Users can insert their typing status"
    ON typing_status FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own typing status"
    ON typing_status FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read typing status in their chats"
    ON typing_status FOR SELECT
    USING (auth.uid() IN (user_id, chat_with));

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_keys_updated_at
    BEFORE UPDATE ON user_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status(user_id UUID, chat_with UUID, is_typing BOOLEAN)
RETURNS void AS $$
BEGIN
    INSERT INTO typing_status (user_id, chat_with, is_typing, last_updated)
    VALUES (user_id, chat_with, is_typing, now())
    ON CONFLICT (user_id, chat_with)
    DO UPDATE SET
        is_typing = EXCLUDED.is_typing,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 