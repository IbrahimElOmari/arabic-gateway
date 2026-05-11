DROP POLICY IF EXISTS "Anyone can view exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Exercise media upload validation" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and admins can upload exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and admins can update exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and admins can delete exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete exercise media" ON storage.objects;
DROP POLICY IF EXISTS "exercise_media_select" ON storage.objects;
DROP POLICY IF EXISTS "exercise_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "exercise_media_update" ON storage.objects;
DROP POLICY IF EXISTS "exercise_media_delete" ON storage.objects;

CREATE POLICY "exercise_media_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'exercise-media');

CREATE POLICY "exercise_media_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exercise-media'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    )
  );

CREATE POLICY "exercise_media_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'exercise-media'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'exercise-media'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    )
  );

CREATE POLICY "exercise_media_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exercise-media'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    )
  );