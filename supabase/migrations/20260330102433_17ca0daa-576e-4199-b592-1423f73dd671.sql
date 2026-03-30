-- Make exercise-media bucket public so getPublicUrl works
UPDATE storage.buckets SET public = true WHERE id = 'exercise-media';

-- Allow teachers and admins to upload to exercise-media
CREATE POLICY "Teachers and admins can upload exercise media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-media'
  AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Allow teachers and admins to update their own uploads
CREATE POLICY "Teachers and admins can update exercise media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercise-media'
  AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Allow teachers and admins to delete exercise media
CREATE POLICY "Teachers and admins can delete exercise media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-media'
  AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Allow anyone to view exercise media (students need to see it)
CREATE POLICY "Anyone can view exercise media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exercise-media');