-- Create password_history table
CREATE TABLE IF NOT EXISTS password_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Add indexes
    CONSTRAINT idx_password_history_user_created 
        UNIQUE (user_id, created_at)
);

-- Create failed_attempts table
CREATE TABLE IF NOT EXISTS failed_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    count INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Add indexes
    CONSTRAINT idx_failed_attempts_user 
        UNIQUE (user_id)
);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Add indexes
    CONSTRAINT idx_reset_tokens_token 
        UNIQUE (token),
    CONSTRAINT idx_reset_tokens_user_created 
        UNIQUE (user_id, created_at)
);

-- Add RLS policies
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Password history policies
CREATE POLICY "Password history visible to owner"
    ON password_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Password history insertable by service role"
    ON password_history
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Failed attempts policies
CREATE POLICY "Failed attempts visible to owner"
    ON failed_attempts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Failed attempts modifiable by service role"
    ON failed_attempts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Reset tokens policies
CREATE POLICY "Reset tokens visible to owner"
    ON password_reset_tokens
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Reset tokens modifiable by service role"
    ON password_reset_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 