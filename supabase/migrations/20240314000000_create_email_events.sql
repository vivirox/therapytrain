-- Create enum for email event types
CREATE TYPE email_event_type AS ENUM (
  'sent',
  'delivered',
  'bounced',
  'spam',
  'opened',
  'clicked'
);

-- Create email_events table
CREATE TABLE email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL,
  type email_event_type NOT NULL,
  recipient TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  user_agent TEXT,
  ip_address INET,
  geolocation JSONB
);

-- Add indexes for common queries
CREATE INDEX idx_email_events_type ON email_events(type);
CREATE INDEX idx_email_events_created_at ON email_events(created_at);
CREATE INDEX idx_email_events_email_id ON email_events(email_id);
CREATE INDEX idx_email_events_recipient ON email_events(recipient);

-- Add RLS policies
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
  ON email_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert access to service role only
CREATE POLICY "Allow insert access to service role"
  ON email_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create view for email metrics
CREATE VIEW email_metrics AS
WITH event_counts AS (
  SELECT
    date_trunc('day', created_at) AS day,
    type,
    COUNT(*) as count
  FROM email_events
  GROUP BY 1, 2
)
SELECT
  day,
  MAX(CASE WHEN type = 'sent' THEN count ELSE 0 END) as sent,
  MAX(CASE WHEN type = 'delivered' THEN count ELSE 0 END) as delivered,
  MAX(CASE WHEN type = 'bounced' THEN count ELSE 0 END) as bounced,
  MAX(CASE WHEN type = 'spam' THEN count ELSE 0 END) as spam,
  MAX(CASE WHEN type = 'opened' THEN count ELSE 0 END) as opened,
  MAX(CASE WHEN type = 'clicked' THEN count ELSE 0 END) as clicked
FROM event_counts
GROUP BY day
ORDER BY day DESC;

-- Grant access to the view
GRANT SELECT ON email_metrics TO authenticated;

-- Create function to calculate delivery time
CREATE OR REPLACE FUNCTION calculate_avg_delivery_time(start_time TIMESTAMPTZ)
RETURNS INTERVAL AS $$
BEGIN
  RETURN (
    SELECT AVG(delivered_at - created_at)
    FROM email_events
    WHERE type = 'delivered'
    AND created_at >= start_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 