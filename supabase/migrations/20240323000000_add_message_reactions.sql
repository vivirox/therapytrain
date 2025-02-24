-- Create reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Create reaction counts materialized view for efficient counting
CREATE MATERIALIZED VIEW message_reaction_counts AS
SELECT 
    message_id,
    emoji,
    COUNT(*) as count,
    ARRAY_AGG(user_id) as user_ids
FROM message_reactions
GROUP BY message_id, emoji;

-- Create index for the materialized view
CREATE UNIQUE INDEX idx_message_reaction_counts 
ON message_reaction_counts(message_id, emoji);

-- Create indexes for the reactions table
CREATE INDEX idx_message_reactions_message_id 
ON message_reactions(message_id);

CREATE INDEX idx_message_reactions_user_id 
ON message_reactions(user_id);

CREATE INDEX idx_message_reactions_created_at 
ON message_reactions(created_at);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view reactions in their threads"
    ON message_reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chat_threads_participants p ON m.thread_id = p.thread_id
            WHERE m.id = message_reactions.message_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add reactions to messages in their threads"
    ON message_reactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chat_threads_participants p ON m.thread_id = p.thread_id
            WHERE m.id = message_reactions.message_id
            AND p.user_id = auth.uid()
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Users can remove their own reactions"
    ON message_reactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to refresh reaction counts
CREATE OR REPLACE FUNCTION refresh_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY message_reaction_counts;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh counts
CREATE TRIGGER refresh_reaction_counts_trigger
    AFTER INSERT OR DELETE ON message_reactions
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_reaction_counts();

-- Add audit logging
CREATE TABLE IF NOT EXISTS reaction_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reaction_id UUID REFERENCES message_reactions(id),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    emoji TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE reaction_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create audit logging function
CREATE OR REPLACE FUNCTION log_reaction_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO reaction_audit_logs (
            reaction_id,
            message_id,
            user_id,
            action,
            emoji,
            metadata
        ) VALUES (
            NEW.id,
            NEW.message_id,
            NEW.user_id,
            'add',
            NEW.emoji,
            jsonb_build_object(
                'timestamp', extract(epoch from NEW.created_at)
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO reaction_audit_logs (
            reaction_id,
            message_id,
            user_id,
            action,
            emoji,
            metadata
        ) VALUES (
            OLD.id,
            OLD.message_id,
            OLD.user_id,
            'remove',
            OLD.emoji,
            jsonb_build_object(
                'timestamp', extract(epoch from NOW())
            )
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER log_reaction_changes_trigger
    AFTER INSERT OR DELETE ON message_reactions
    FOR EACH ROW
    EXECUTE FUNCTION log_reaction_changes();

-- Add comments for documentation
COMMENT ON TABLE message_reactions IS 'Stores message reactions with emoji and user associations';
COMMENT ON MATERIALIZED VIEW message_reaction_counts IS 'Cached counts of reactions per message and emoji';
COMMENT ON TABLE reaction_audit_logs IS 'Audit trail for reaction changes'; 