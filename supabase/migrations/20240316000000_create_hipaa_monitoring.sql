-- Create enum types
CREATE TYPE hipaa_violation_type AS ENUM (
  'unauthorized_access',
  'phi_exposure',
  'encryption_failure',
  'audit_gap',
  'retention_violation',
  'authentication_failure',
  'integrity_breach'
);

CREATE TYPE violation_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE exposure_level AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE incident_status AS ENUM (
  'initiated',
  'investigating',
  'remediated',
  'closed'
);

-- Create PHI access logs table
CREATE TABLE phi_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  record_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  authorized BOOLEAN NOT NULL DEFAULT false,
  exposure_level exposure_level,
  exposure_type TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create authentication logs table
CREATE TABLE authentication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create encryption logs table
CREATE TABLE encryption_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL,
  status TEXT NOT NULL,
  failure_type TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create HIPAA violation logs table
CREATE TABLE hipaa_violation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type hipaa_violation_type NOT NULL,
  severity violation_severity NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  remediation_steps TEXT[],
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create breach incidents table
CREATE TABLE breach_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  violation_id UUID NOT NULL,
  status incident_status NOT NULL DEFAULT 'initiated',
  severity violation_severity NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  remediation_plan TEXT,
  remediation_completed_at TIMESTAMPTZ,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create encryption incidents table
CREATE TABLE encryption_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  violation_id UUID NOT NULL,
  status incident_status NOT NULL DEFAULT 'initiated',
  failure_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  remediation_plan TEXT,
  remediation_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_phi_access_logs_user_id ON phi_access_logs(user_id);
CREATE INDEX idx_phi_access_logs_authorized ON phi_access_logs(authorized);
CREATE INDEX idx_phi_access_logs_created_at ON phi_access_logs(created_at);
CREATE INDEX idx_phi_access_logs_exposure_level ON phi_access_logs(exposure_level);

CREATE INDEX idx_authentication_logs_user_id ON authentication_logs(user_id);
CREATE INDEX idx_authentication_logs_status ON authentication_logs(status);
CREATE INDEX idx_authentication_logs_created_at ON authentication_logs(created_at);

CREATE INDEX idx_encryption_logs_status ON encryption_logs(status);
CREATE INDEX idx_encryption_logs_created_at ON encryption_logs(created_at);

CREATE INDEX idx_hipaa_violation_logs_type ON hipaa_violation_logs(type);
CREATE INDEX idx_hipaa_violation_logs_severity ON hipaa_violation_logs(severity);
CREATE INDEX idx_hipaa_violation_logs_created_at ON hipaa_violation_logs(created_at);

CREATE INDEX idx_breach_incidents_status ON breach_incidents(status);
CREATE INDEX idx_breach_incidents_severity ON breach_incidents(severity);
CREATE INDEX idx_breach_incidents_created_at ON breach_incidents(created_at);

CREATE INDEX idx_encryption_incidents_status ON encryption_incidents(status);
CREATE INDEX idx_encryption_incidents_created_at ON encryption_incidents(created_at);

-- Add RLS policies
ALTER TABLE phi_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE authentication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipaa_violation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_incidents ENABLE ROW LEVEL SECURITY;

-- PHI access logs policies
CREATE POLICY "Allow read access to admins and compliance officers"
  ON phi_access_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'compliance_officer')
  );

-- Authentication logs policies
CREATE POLICY "Allow read access to admins and security officers"
  ON authentication_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'security_officer')
  );

-- Encryption logs policies
CREATE POLICY "Allow read access to admins and security officers"
  ON encryption_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'security_officer')
  );

-- HIPAA violation logs policies
CREATE POLICY "Allow read access to admins and compliance officers"
  ON hipaa_violation_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'compliance_officer')
  );

-- Breach incidents policies
CREATE POLICY "Allow read access to admins and incident responders"
  ON breach_incidents
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'incident_responder')
  );

-- Encryption incidents policies
CREATE POLICY "Allow read access to admins and security officers"
  ON encryption_incidents
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'security_officer')
  );

-- Create view for violation metrics
CREATE VIEW violation_metrics AS
WITH violation_counts AS (
  SELECT
    date_trunc('day', created_at) AS day,
    type,
    severity,
    COUNT(*) as count
  FROM hipaa_violation_logs
  GROUP BY 1, 2, 3
)
SELECT
  day,
  type,
  json_build_object(
    'low', SUM(CASE WHEN severity = 'low' THEN count ELSE 0 END),
    'medium', SUM(CASE WHEN severity = 'medium' THEN count ELSE 0 END),
    'high', SUM(CASE WHEN severity = 'high' THEN count ELSE 0 END),
    'critical', SUM(CASE WHEN severity = 'critical' THEN count ELSE 0 END)
  ) as counts
FROM violation_counts
GROUP BY day, type
ORDER BY day DESC;

-- Grant access to the view
GRANT SELECT ON violation_metrics TO authenticated; 