DROP POLICY IF EXISTS "Students can update their own files" ON storage.objects;

CREATE POLICY "Students can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'student-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);