-- Create message_edits table
CREATE TABLE message_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id),
    editor_id UUID NOT NULL REFERENCES auth.users(id),
    previous_content TEXT NOT NULL,
    previous_iv TEXT NOT NULL,
    new_content TEXT NOT NULL,
    new_iv TEXT NOT NULL,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_message_edits_message ON message_edits(message_id);
CREATE INDEX idx_message_edits_editor ON message_edits(editor_id);
CREATE INDEX idx_message_edits_timestamp ON message_edits(edited_at);

-- Add RLS policies
ALTER TABLE message_edits ENABLE ROW LEVEL SECURITY;

-- Message edit policies
CREATE POLICY "Users can insert edits for their own messages"
    ON message_edits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages
            WHERE id = message_id
            AND sender_id = auth.uid()
        )
    );

CREATE POLICY "Users can view edits for messages they can see"
    ON message_edits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages
            WHERE id = message_id
            AND (sender_id = auth.uid() OR recipient_id = auth.uid())
        )
    );

-- Add edited flag to messages table
ALTER TABLE messages ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN last_edited_at TIMESTAMPTZ;

-- Add trigger to update message edit status
CREATE OR REPLACE FUNCTION update_message_edit_status()
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

CREATE TRIGGER update_message_edit_status_trigger
    AFTER INSERT ON message_edits
    FOR EACH ROW
    EXECUTE FUNCTION update_message_edit_status(); 