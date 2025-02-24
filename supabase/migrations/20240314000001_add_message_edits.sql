-- Create chat_message_edits table for encrypted chat messages
CREATE TABLE chat_message_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id),
    editor_id UUID NOT NULL REFERENCES auth.users(id),
    previous_content TEXT NOT NULL,
    previous_iv TEXT NOT NULL,
    new_content TEXT NOT NULL,
    new_iv TEXT NOT NULL,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create session_message_edits table for therapy session messages
CREATE TABLE session_message_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id),
    editor_id UUID NOT NULL REFERENCES auth.users(id),
    previous_content TEXT NOT NULL,
    new_content TEXT NOT NULL,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for chat message edits
CREATE INDEX idx_chat_message_edits_message ON chat_message_edits(message_id);
CREATE INDEX idx_chat_message_edits_editor ON chat_message_edits(editor_id);
CREATE INDEX idx_chat_message_edits_timestamp ON chat_message_edits(edited_at);

-- Add indexes for session message edits
CREATE INDEX idx_session_message_edits_message ON session_message_edits(message_id);
CREATE INDEX idx_session_message_edits_editor ON session_message_edits(editor_id);
CREATE INDEX idx_session_message_edits_timestamp ON session_message_edits(edited_at);

-- Add RLS policies
ALTER TABLE chat_message_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_message_edits ENABLE ROW LEVEL SECURITY;

-- Chat message edit policies
CREATE POLICY "Users can insert edits for their own chat messages"
    ON chat_message_edits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_messages
            WHERE id = message_id
            AND sender_id = auth.uid()
        )
    );

CREATE POLICY "Users can view edits for chat messages they can see"
    ON chat_message_edits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_messages
            WHERE id = message_id
            AND (sender_id = auth.uid() OR recipient_id = auth.uid())
        )
    );

-- Session message edit policies
CREATE POLICY "Users can insert edits for their own session messages"
    ON session_message_edits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN sessions s ON m.session_id = s.id
            WHERE m.id = message_id
            AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view edits for session messages they can see"
    ON session_message_edits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN sessions s ON m.session_id = s.id
            WHERE m.id = message_id
            AND (s.client_id = auth.uid() OR s.therapist_id = auth.uid())
        )
    );

-- Add edited flag to both message tables
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Add trigger to update chat message edit status
CREATE OR REPLACE FUNCTION update_chat_message_edit_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_messages
    SET 
        is_edited = true,
        last_edited_at = NEW.edited_at
    WHERE id = NEW.message_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_chat_message_edit_status_trigger
    AFTER INSERT ON chat_message_edits
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_message_edit_status();

-- Add trigger to update session message edit status
CREATE OR REPLACE FUNCTION update_session_message_edit_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE messages
    SET 
        is_edited = true,
        last_edited_at = NEW.edited_at
    WHERE id = NEW.message_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_session_message_edit_status_trigger
    AFTER INSERT ON session_message_edits
    FOR EACH ROW
    EXECUTE FUNCTION update_session_message_edit_status(); 