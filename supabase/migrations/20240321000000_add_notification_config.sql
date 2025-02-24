-- Create notification_config table
CREATE TABLE notification_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  email_recipients TEXT[] NOT NULL DEFAULT '{}',
  slack_enabled BOOLEAN NOT NULL DEFAULT false,
  slack_channel TEXT,
  throttle_max_notifications INTEGER NOT NULL DEFAULT 10,
  throttle_window_ms INTEGER NOT NULL DEFAULT 3600000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger to update updated_at
CREATE TRIGGER set_notification_config_updated_at
  BEFORE UPDATE ON notification_config
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Insert default configuration
INSERT INTO notification_config (
  enabled,
  email_enabled,
  email_recipients,
  slack_enabled,
  slack_channel,
  throttle_max_notifications,
  throttle_window_ms
) VALUES (
  false,
  false,
  '{}',
  false,
  null,
  10,
  3600000
); 