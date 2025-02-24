-- Create enum for thread status
CREATE TYPE thread_status AS ENUM (
    'active',
    'archived',
    'pinned',
    'hidden'
);

-- Create thread hierarchy table
CREATE TABLE IF NOT EXISTS thread_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES thread_hierarchy(id),
    thread_id UUID NOT NULL REFERENCES chat_threads(id),
    position INTEGER NOT NULL,
    path LTREE NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_position CHECK (position >= 0),
    CONSTRAINT valid_depth CHECK (depth >= 0)
);

-- Create thread metadata table
CREATE TABLE IF NOT EXISTS thread_metadata (
    thread_id UUID PRIMARY KEY REFERENCES chat_threads(id),
    title TEXT,
    description TEXT,
    status thread_status NOT NULL DEFAULT 'active',
    color TEXT,
    icon TEXT,
    custom_properties JSONB,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create thread group table
CREATE TABLE IF NOT EXISTS thread_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    position INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_position CHECK (position >= 0)
);

-- Create thread group membership table
CREATE TABLE IF NOT EXISTS thread_group_members (
    group_id UUID NOT NULL REFERENCES thread_groups(id),
    thread_id UUID NOT NULL REFERENCES chat_threads(id),
    position INTEGER NOT NULL,
    added_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, thread_id),
    CONSTRAINT valid_position CHECK (position >= 0)
);

-- Create thread state table for user-specific states
CREATE TABLE IF NOT EXISTS thread_states (
    thread_id UUID NOT NULL REFERENCES chat_threads(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    custom_state JSONB,
    last_read_at TIMESTAMPTZ,
    notification_preferences JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

-- Create thread audit log
CREATE TABLE IF NOT EXISTS thread_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_thread_hierarchy_parent_id ON thread_hierarchy(parent_id);
CREATE INDEX idx_thread_hierarchy_thread_id ON thread_hierarchy(thread_id);
CREATE INDEX idx_thread_hierarchy_path ON thread_hierarchy USING GIST (path);
CREATE INDEX idx_thread_metadata_status ON thread_metadata(status);
CREATE INDEX idx_thread_metadata_last_activity ON thread_metadata(last_activity_at);
CREATE INDEX idx_thread_groups_created_by ON thread_groups(created_by);
CREATE INDEX idx_thread_group_members_thread_id ON thread_group_members(thread_id);
CREATE INDEX idx_thread_states_user_id ON thread_states(user_id);
CREATE INDEX idx_thread_audit_logs_thread_id ON thread_audit_logs(thread_id);
CREATE INDEX idx_thread_audit_logs_user_id ON thread_audit_logs(user_id);
CREATE INDEX idx_thread_audit_logs_created_at ON thread_audit_logs(created_at);

-- Enable RLS
ALTER TABLE thread_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view thread hierarchy they have access to"
    ON thread_hierarchy
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads_participants
            WHERE thread_id = thread_hierarchy.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can modify thread hierarchy they have access to"
    ON thread_hierarchy
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads_participants
            WHERE thread_id = thread_hierarchy.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view thread metadata they have access to"
    ON thread_metadata
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads_participants
            WHERE thread_id = thread_metadata.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can modify thread metadata they have access to"
    ON thread_metadata
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads_participants
            WHERE thread_id = thread_metadata.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view thread groups they have access to"
    ON thread_groups
    FOR SELECT
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM thread_group_members gm
            JOIN chat_threads_participants p ON gm.thread_id = p.thread_id
            WHERE gm.group_id = thread_groups.id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own thread groups"
    ON thread_groups
    FOR ALL
    USING (created_by = auth.uid());

CREATE POLICY "Users can view group members they have access to"
    ON thread_group_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads_participants
            WHERE thread_id = thread_group_members.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage group members they created"
    ON thread_group_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM thread_groups
            WHERE id = thread_group_members.group_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own thread states"
    ON thread_states
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can view thread audit logs they have access to"
    ON thread_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads_participants
            WHERE thread_id = thread_audit_logs.thread_id
            AND user_id = auth.uid()
        )
    );

-- Create functions for managing thread hierarchy
CREATE OR REPLACE FUNCTION update_thread_hierarchy_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = text2ltree(NEW.id::text);
        NEW.depth = 0;
    ELSE
        SELECT path || text2ltree(NEW.id::text), depth + 1
        INTO NEW.path, NEW.depth
        FROM thread_hierarchy
        WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_thread_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO thread_audit_logs (
        thread_id,
        user_id,
        action,
        metadata
    ) VALUES (
        COALESCE(NEW.thread_id, OLD.thread_id),
        auth.uid(),
        CASE
            WHEN TG_OP = 'INSERT' THEN 'create'
            WHEN TG_OP = 'UPDATE' THEN 'update'
            WHEN TG_OP = 'DELETE' THEN 'delete'
        END,
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'old_data', to_jsonb(OLD),
            'new_data', to_jsonb(NEW)
        )
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_thread_hierarchy_path_trigger
    BEFORE INSERT OR UPDATE ON thread_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_hierarchy_path();

CREATE TRIGGER log_thread_hierarchy_changes
    AFTER INSERT OR UPDATE OR DELETE ON thread_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION log_thread_changes();

CREATE TRIGGER log_thread_metadata_changes
    AFTER INSERT OR UPDATE OR DELETE ON thread_metadata
    FOR EACH ROW
    EXECUTE FUNCTION log_thread_changes();

CREATE TRIGGER log_thread_group_changes
    AFTER INSERT OR UPDATE OR DELETE ON thread_groups
    FOR EACH ROW
    EXECUTE FUNCTION log_thread_changes();

-- Add comments for documentation
COMMENT ON TABLE thread_hierarchy IS 'Stores the hierarchical structure of chat threads';
COMMENT ON TABLE thread_metadata IS 'Stores additional metadata and settings for chat threads';
COMMENT ON TABLE thread_groups IS 'Allows organizing threads into custom groups';
COMMENT ON TABLE thread_group_members IS 'Maps threads to groups with ordering';
COMMENT ON TABLE thread_states IS 'Stores user-specific thread states and preferences';
COMMENT ON TABLE thread_audit_logs IS 'Audit trail for thread-related operations'; 