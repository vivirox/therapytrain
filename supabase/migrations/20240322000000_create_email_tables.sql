-- Create email_templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL,
  html TEXT NOT NULL,
  text TEXT,
  subject VARCHAR(255) NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  category VARCHAR(50) NOT NULL CHECK (category IN ('transactional', 'marketing', 'notification')),
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, version, locale)
);

-- Create email_events table
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  recipient VARCHAR(255) NOT NULL,
  metadata JSONB,
  user_agent TEXT,
  ip_address INET,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for email events querying
CREATE INDEX idx_email_events_email_id ON email_events(email_id);
CREATE INDEX idx_email_events_type ON email_events(type);
CREATE INDEX idx_email_events_recipient ON email_events(recipient);
CREATE INDEX idx_email_events_timestamp ON email_events(timestamp);

-- Create email_template_versions table for version control
CREATE TABLE email_template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES email_templates(id),
  version VARCHAR(50) NOT NULL,
  html TEXT NOT NULL,
  text TEXT,
  subject VARCHAR(255) NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(template_id, version)
);

-- Create email_analytics table for aggregated metrics
CREATE TABLE email_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES email_templates(id),
  date DATE NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  bounced_count INTEGER NOT NULL DEFAULT 0,
  complained_count INTEGER NOT NULL DEFAULT 0,
  unsubscribed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, date)
);

-- Create function to update email_analytics
CREATE OR REPLACE FUNCTION update_email_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_analytics (template_id, date, sent_count, delivered_count, opened_count, clicked_count, bounced_count, complained_count, unsubscribed_count)
  VALUES (
    NEW.template_id,
    DATE(NEW.timestamp),
    CASE WHEN NEW.type = 'sent' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'delivered' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'opened' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'clicked' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'bounced' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'complained' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'unsubscribed' THEN 1 ELSE 0 END
  )
  ON CONFLICT (template_id, date)
  DO UPDATE SET
    sent_count = email_analytics.sent_count + CASE WHEN NEW.type = 'sent' THEN 1 ELSE 0 END,
    delivered_count = email_analytics.delivered_count + CASE WHEN NEW.type = 'delivered' THEN 1 ELSE 0 END,
    opened_count = email_analytics.opened_count + CASE WHEN NEW.type = 'opened' THEN 1 ELSE 0 END,
    clicked_count = email_analytics.clicked_count + CASE WHEN NEW.type = 'clicked' THEN 1 ELSE 0 END,
    bounced_count = email_analytics.bounced_count + CASE WHEN NEW.type = 'bounced' THEN 1 ELSE 0 END,
    complained_count = email_analytics.complained_count + CASE WHEN NEW.type = 'complained' THEN 1 ELSE 0 END,
    unsubscribed_count = email_analytics.unsubscribed_count + CASE WHEN NEW.type = 'unsubscribed' THEN 1 ELSE 0 END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for email analytics
CREATE TRIGGER email_events_analytics_trigger
AFTER INSERT ON email_events
FOR EACH ROW
EXECUTE FUNCTION update_email_analytics();

-- Add updated_at triggers
CREATE TRIGGER set_timestamp_email_templates
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_email_analytics
BEFORE UPDATE ON email_analytics
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); 