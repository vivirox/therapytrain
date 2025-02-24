-- Create threads table
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    participant_count INTEGER NOT NULL DEFAULT 2,
    message_count INTEGER NOT NULL DEFAULT 0
);

-- Create thread_participants table
CREATE TABLE thread_participants (
    thread_id UUID REFERENCES threads(id),
    user_id UUID REFERENCES auth.users(id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_muted BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (thread_id, user_id)
);

-- Add thread_id to messages table
ALTER TABLE messages ADD COLUMN thread_id UUID REFERENCES threads(id);
ALTER TABLE messages ADD COLUMN parent_message_id UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN reply_count INTEGER NOT NULL DEFAULT 0;

-- Create thread_summaries table for encrypted thread summaries
CREATE TABLE thread_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    encrypted_summary TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (thread_id, user_id)
);

-- Add indexes
CREATE INDEX idx_threads_creator ON threads(creator_id);
CREATE INDEX idx_threads_updated ON threads(updated_at);
CREATE INDEX idx_threads_last_message ON threads(last_message_at);
CREATE INDEX idx_thread_participants_user ON thread_participants(user_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE INDEX idx_thread_summaries_thread ON thread_summaries(thread_id);
CREATE INDEX idx_thread_summaries_user ON thread_summaries(user_id);

-- Enable RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for threads
CREATE POLICY "Users can create threads"
    ON threads FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view threads they participate in"
    ON threads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM thread_participants
            WHERE thread_id = id
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for thread_participants
CREATE POLICY "Users can view thread participants"
    ON thread_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM thread_participants tp
            WHERE tp.thread_id = thread_id
            AND tp.user_id = auth.uid()
        )
    );

CREATE POLICY "Thread creators can add participants"
    ON thread_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads
            WHERE id = thread_id
            AND creator_id = auth.uid()
        )
    );

-- RLS Policies for thread_summaries
CREATE POLICY "Users can manage their thread summaries"
    ON thread_summaries FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Add trigger to update thread message count and last_message_at
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE threads
        SET 
            message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = now()
        WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE threads
        SET 
            message_count = message_count - 1,
            updated_at = now()
        WHERE id = OLD.thread_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_thread_stats_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_stats();

-- Add trigger to update reply count
CREATE OR REPLACE FUNCTION update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
        UPDATE messages
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_message_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
        UPDATE messages
        SET reply_count = reply_count - 1
        WHERE id = OLD.parent_message_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_message_reply_count_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_reply_count(); 