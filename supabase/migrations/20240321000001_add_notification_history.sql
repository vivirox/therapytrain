-- Create notification_history table
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  channels INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on notification_id for faster lookups
CREATE INDEX idx_notification_history_notification_id ON notification_history(notification_id);

-- Create index on type and severity for filtering
CREATE INDEX idx_notification_history_type_severity ON notification_history(type, severity);

-- Create index on created_at for time-based queries
CREATE INDEX idx_notification_history_created_at ON notification_history(created_at);

-- Add RLS policies
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
  ON notification_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert access to service role only
CREATE POLICY "Allow insert access to service role"
  ON notification_history
  FOR INSERT
  TO service_role
  WITH CHECK (true); 