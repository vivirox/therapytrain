-- Create enum for attachment types
CREATE TYPE attachment_type AS ENUM (
    'document',
    'image',
    'audio',
    'video',
    'other'
);

-- Create enum for attachment status
CREATE TYPE attachment_status AS ENUM (
    'pending',
    'uploading',
    'processing',
    'ready',
    'failed',
    'deleted'
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id),
    message_id UUID REFERENCES messages(id),
    uploader_id UUID NOT NULL REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    file_type attachment_type NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    status attachment_status NOT NULL DEFAULT 'pending',
    encryption_key_version TEXT NOT NULL DEFAULT 'current',
    encryption_key_id UUID,
    encryption_metadata JSONB,
    storage_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    virus_scan_status TEXT,
    virus_scan_result JSONB,
    preview_status TEXT,
    preview_metadata JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    is_latest BOOLEAN NOT NULL DEFAULT true,
    previous_version_id UUID REFERENCES attachments(id),
    metadata JSONB,
    retention_policy JSONB,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT valid_file_size CHECK (size_bytes > 0),
    CONSTRAINT valid_file_name CHECK (length(file_name) > 0)
);

-- Create table for attachment access logs
CREATE TABLE IF NOT EXISTS attachment_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id UUID NOT NULL REFERENCES attachments(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    access_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for attachment shares
CREATE TABLE IF NOT EXISTS attachment_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id UUID NOT NULL REFERENCES attachments(id),
    shared_by UUID NOT NULL REFERENCES auth.users(id),
    shared_with UUID NOT NULL REFERENCES auth.users(id),
    permissions JSONB NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT valid_permissions CHECK (permissions ? 'read' AND permissions ? 'download')
);

-- Add indexes
CREATE INDEX idx_attachments_thread_id ON attachments(thread_id);
CREATE INDEX idx_attachments_message_id ON attachments(message_id);
CREATE INDEX idx_attachments_uploader_id ON attachments(uploader_id);
CREATE INDEX idx_attachments_status ON attachments(status);
CREATE INDEX idx_attachments_content_hash ON attachments(content_hash);
CREATE INDEX idx_attachments_file_type ON attachments(file_type);
CREATE INDEX idx_attachments_created_at ON attachments(created_at);
CREATE INDEX idx_attachment_access_logs_attachment_id ON attachment_access_logs(attachment_id);
CREATE INDEX idx_attachment_access_logs_user_id ON attachment_access_logs(user_id);
CREATE INDEX idx_attachment_shares_attachment_id ON attachment_shares(attachment_id);
CREATE INDEX idx_attachment_shares_shared_with ON attachment_shares(shared_with);

-- Add RLS policies
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment_shares ENABLE ROW LEVEL SECURITY;

-- Attachments policies
CREATE POLICY "Users can view attachments they have access to"
    ON attachments
    FOR SELECT
    USING (
        auth.uid() = uploader_id OR
        EXISTS (
            SELECT 1 FROM attachment_shares
            WHERE attachment_id = attachments.id
            AND shared_with = auth.uid()
            AND revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at > NOW())
        ) OR
        EXISTS (
            SELECT 1 FROM chat_threads_participants
            WHERE thread_id = attachments.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload attachments to their threads"
    ON attachments
    FOR INSERT
    WITH CHECK (
        auth.uid() = uploader_id AND
        EXISTS (
            SELECT 1 FROM chat_threads_participants
            WHERE thread_id = attachments.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own attachments"
    ON attachments
    FOR UPDATE
    USING (auth.uid() = uploader_id)
    WITH CHECK (auth.uid() = uploader_id);

-- Access logs policies
CREATE POLICY "Users can view access logs for their attachments"
    ON attachment_access_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM attachments
            WHERE id = attachment_access_logs.attachment_id
            AND uploader_id = auth.uid()
        )
    );

CREATE POLICY "System can insert access logs"
    ON attachment_access_logs
    FOR INSERT
    WITH CHECK (true);

-- Shares policies
CREATE POLICY "Users can view shares for their attachments"
    ON attachment_shares
    FOR SELECT
    USING (
        auth.uid() = shared_by OR
        auth.uid() = shared_with
    );

CREATE POLICY "Users can share their attachments"
    ON attachment_shares
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attachments
            WHERE id = attachment_shares.attachment_id
            AND uploader_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their shares"
    ON attachment_shares
    FOR UPDATE
    USING (auth.uid() = shared_by)
    WITH CHECK (auth.uid() = shared_by);

-- Functions for attachment management
CREATE OR REPLACE FUNCTION update_attachment_access_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE attachments
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = NEW.attachment_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_attachment_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.version > 1 THEN
        -- Update previous version
        UPDATE attachments
        SET is_latest = false
        WHERE id = NEW.previous_version_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_attachment_access_count_trigger
    AFTER INSERT ON attachment_access_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_attachment_access_count();

CREATE TRIGGER handle_attachment_version_trigger
    AFTER INSERT ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION handle_attachment_version();

-- Update timestamps trigger
CREATE TRIGGER update_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_attachment_shares_updated_at
    BEFORE UPDATE ON attachment_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE attachments IS 'Stores file attachments with encryption and versioning support';
COMMENT ON TABLE attachment_access_logs IS 'Tracks all access to attachments for audit purposes';
COMMENT ON TABLE attachment_shares IS 'Manages attachment sharing between users'; 