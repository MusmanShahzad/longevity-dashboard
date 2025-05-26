-- Add biomarker support to lab_reports table
ALTER TABLE lab_reports 
ADD COLUMN biomarkers JSONB,
ADD COLUMN extraction_confidence DECIMAL(3,2),
ADD COLUMN health_insights TEXT[],
ADD COLUMN processed_at TIMESTAMP;

-- Create index for biomarker queries
CREATE INDEX idx_lab_reports_biomarkers ON lab_reports USING GIN (biomarkers);
CREATE INDEX idx_lab_reports_processed_at ON lab_reports(processed_at DESC);

-- Create biomarkers table for normalized storage (optional)
CREATE TABLE biomarkers (
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
CREATE INDEX idx_biomarkers_lab_report ON biomarkers(lab_report_id);
CREATE INDEX idx_biomarkers_name ON biomarkers(name);
CREATE INDEX idx_biomarkers_status ON biomarkers(status);
CREATE INDEX idx_biomarkers_category ON biomarkers(category);

-- Add RLS policies for biomarkers
ALTER TABLE biomarkers ENABLE ROW LEVEL SECURITY;

-- Users can only view biomarkers from their own lab reports
CREATE POLICY "Users can view own biomarkers" ON biomarkers
  FOR SELECT USING (
    lab_report_id IN (
      SELECT id FROM lab_reports WHERE user_id = auth.uid()::text
    )
  );

-- Service role can manage all biomarkers
CREATE POLICY "Service role can manage biomarkers" ON biomarkers
  FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON COLUMN lab_reports.biomarkers IS 'JSON array of extracted biomarker data';
COMMENT ON COLUMN lab_reports.extraction_confidence IS 'Confidence score (0.0-1.0) for biomarker extraction accuracy';
COMMENT ON COLUMN lab_reports.health_insights IS 'Array of AI-generated health insights based on biomarkers';
COMMENT ON COLUMN lab_reports.processed_at IS 'Timestamp when biomarker extraction was completed';

COMMENT ON TABLE biomarkers IS 'Normalized storage for individual biomarker values extracted from lab reports'; 