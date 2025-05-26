-- Manual migration to add biomarker support to lab_reports table
-- Run this in your Supabase SQL Editor

-- Add biomarker support columns to lab_reports table
ALTER TABLE lab_reports 
ADD COLUMN IF NOT EXISTS biomarkers JSONB,
ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS health_insights TEXT[],
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Create index for biomarker queries
CREATE INDEX IF NOT EXISTS idx_lab_reports_biomarkers ON lab_reports USING GIN (biomarkers);
CREATE INDEX IF NOT EXISTS idx_lab_reports_processed_at ON lab_reports(processed_at DESC);

-- Create biomarkers table for normalized storage (optional)
CREATE TABLE IF NOT EXISTS biomarkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_report_id UUID REFERENCES lab_reports(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  value DECIMAL(10,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  reference_range VARCHAR(100),
  status VARCHAR(20) CHECK (status IN ('normal', 'high', 'low', 'critical')),
  category VARCHAR(50) CHECK (category IN ('cardiovascular', 'metabolic', 'inflammatory', 'hormonal', 'other')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for biomarkers table
CREATE INDEX IF NOT EXISTS idx_biomarkers_lab_report ON biomarkers(lab_report_id);
CREATE INDEX IF NOT EXISTS idx_biomarkers_name ON biomarkers(name);
CREATE INDEX IF NOT EXISTS idx_biomarkers_status ON biomarkers(status);
CREATE INDEX IF NOT EXISTS idx_biomarkers_category ON biomarkers(category);

-- Add RLS policies for biomarkers
ALTER TABLE biomarkers ENABLE ROW LEVEL SECURITY;

-- Users can only view biomarkers from their own lab reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'biomarkers' 
    AND policyname = 'Users can view own biomarkers'
  ) THEN
    CREATE POLICY "Users can view own biomarkers" ON biomarkers
      FOR SELECT USING (
        lab_report_id IN (
          SELECT id FROM lab_reports WHERE user_id = auth.uid()::text
        )
      );
  END IF;
END $$;

-- Service role can manage all biomarkers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'biomarkers' 
    AND policyname = 'Service role can manage biomarkers'
  ) THEN
    CREATE POLICY "Service role can manage biomarkers" ON biomarkers
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Create audit logs table for HIPAA compliance
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_timestamp ON audit_logs(risk_level, timestamp DESC);

-- Enable RLS for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert audit logs (prevents tampering)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'Service role can insert audit logs'
  ) THEN
    CREATE POLICY "Service role can insert audit logs" ON audit_logs
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Users can only view their own audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'Users can view own audit logs'
  ) THEN
    CREATE POLICY "Users can view own audit logs" ON audit_logs
      FOR SELECT USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN lab_reports.biomarkers IS 'JSON array of extracted biomarker data';
COMMENT ON COLUMN lab_reports.extraction_confidence IS 'Confidence score (0.0-1.0) for biomarker extraction accuracy';
COMMENT ON COLUMN lab_reports.health_insights IS 'Array of AI-generated health insights based on biomarkers';
COMMENT ON COLUMN lab_reports.processed_at IS 'Timestamp when biomarker extraction was completed';

COMMENT ON TABLE biomarkers IS 'Normalized storage for individual biomarker values extracted from lab reports';
COMMENT ON TABLE audit_logs IS 'HIPAA-compliant audit trail for all data access and modifications';

-- Success message
SELECT 'Biomarker support and HIPAA compliance tables created successfully!' as result; 