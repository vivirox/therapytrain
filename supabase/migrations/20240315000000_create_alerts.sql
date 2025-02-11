-- Create enum for alert types
CREATE TYPE alert_type AS ENUM (
  'bounce_rate',
  'spam_reports',
  'rapid_sending',
  'suspicious_pattern'
);

-- Create enum for alert severity
CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

-- Create alerts table
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  sender TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for common queries
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_sender ON alerts(sender);
CREATE INDEX idx_alerts_resolved_at ON alerts(resolved_at);

-- Add RLS policies
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert/update access to service role only
CREATE POLICY "Allow insert access to service role"
  ON alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow update access to service role"
  ON alerts
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create view for alert metrics
CREATE VIEW alert_metrics AS
WITH alert_counts AS (
  SELECT
    date_trunc('day', created_at) AS day,
    type,
    severity,
    COUNT(*) as count
  FROM alerts
  WHERE resolved_at IS NULL
  GROUP BY 1, 2, 3
)
SELECT
  day,
  type,
  json_build_object(
    'info', SUM(CASE WHEN severity = 'info' THEN count ELSE 0 END),
    'warning', SUM(CASE WHEN severity = 'warning' THEN count ELSE 0 END),
    'critical', SUM(CASE WHEN severity = 'critical' THEN count ELSE 0 END)
  ) as counts
FROM alert_counts
GROUP BY day, type
ORDER BY day DESC;

-- Grant access to the view
GRANT SELECT ON alert_metrics TO authenticated; 