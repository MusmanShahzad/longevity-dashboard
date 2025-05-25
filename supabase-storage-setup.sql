-- Create storage bucket for lab reports (if not already created via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-reports', 'lab-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to upload files (for backend uploads)
CREATE POLICY "Service role can manage all files" ON storage.objects
FOR ALL USING (auth.role() = 'service_role');

-- Policy to allow public read access to files (if bucket is public)
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'lab-reports');

-- Alternative: If you want authenticated users to read their own files only
-- CREATE POLICY "Users can view their own lab reports" ON storage.objects
-- FOR SELECT USING (
--   bucket_id = 'lab-reports' 
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- ); 