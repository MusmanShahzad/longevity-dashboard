-- Create audit logs table for HIPAA compliance
CREATE TABLE audit_logs (
  id VARCHAR PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'data_access', 'data_modification', 'data_deletion', 'login_attempt', 
    'logout', 'failed_access', 'export_data', 'print_data',
    'biomarker_extraction', 'lab_report_upload', 'health_alert_generated'
  )),
  user_id VARCHAR NOT NULL,
  patient_id VARCHAR,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR,
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  details JSONB,
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);

-- Create composite indexes for common queries
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_risk_timestamp ON audit_logs(risk_level, timestamp DESC);

-- Enable RLS for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert audit logs (prevents tampering)
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid()::text);

-- Admins can view all audit logs (for compliance officers)
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Create function to automatically log data access
CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called by triggers on sensitive tables
  -- For now, just a placeholder
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'HIPAA-compliant audit trail for all data access and modifications';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event being audited';
COMMENT ON COLUMN audit_logs.risk_level IS 'Risk assessment of the audited event';
COMMENT ON COLUMN audit_logs.details IS 'Additional context and metadata for the event';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user performing the action';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client information for the request';

-- Create view for security dashboard
CREATE VIEW security_dashboard AS
SELECT 
  DATE_TRUNC('day', timestamp) as date,
  event_type,
  risk_level,
  COUNT(*) as event_count,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_attempts,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp), event_type, risk_level
ORDER BY date DESC, event_count DESC;

-- Grant access to security dashboard
GRANT SELECT ON security_dashboard TO authenticated;

-- Create function to clean up old audit logs (for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep audit logs for 7 years (HIPAA requirement)
  DELETE FROM audit_logs 
  WHERE timestamp < NOW() - INTERVAL '7 years';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO audit_logs (
    id, event_type, user_id, resource_type, action, 
    ip_address, user_agent, success, risk_level, details
  ) VALUES (
    gen_random_uuid()::text,
    'data_deletion',
    'system',
    'audit_logs',
    'automated_cleanup',
    '127.0.0.1',
    'system_scheduler',
    true,
    'low',
    jsonb_build_object('deleted_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 