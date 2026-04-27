
-- Create storage bucket for resume uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false);

-- Allow authenticated users to upload their own resumes
CREATE POLICY "Users can upload resumes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to read their own resumes
CREATE POLICY "Users can read own resumes"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
