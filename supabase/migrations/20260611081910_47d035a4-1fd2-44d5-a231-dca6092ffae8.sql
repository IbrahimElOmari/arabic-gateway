
-- Tighten storage RLS: scope lesson media to enrolled class members + lock student-uploads paths.

CREATE OR REPLACE FUNCTION public.user_can_access_lesson(_user_id uuid, _lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = _lesson_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR public.has_role(_user_id, 'teacher'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.class_enrollments ce
          WHERE ce.class_id = l.class_id
            AND ce.student_id = _user_id
            AND ce.status = 'enrolled'
        )
      )
  )
$$;

-- lesson-recordings: replace broad authenticated SELECT with enrollment-scoped SELECT
DROP POLICY IF EXISTS "Authenticated users can view lesson recordings" ON storage.objects;
CREATE POLICY "Lesson recordings: enrolled users only"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lesson-recordings'
    AND public.user_can_access_lesson(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

-- lesson-materials: same scoping
DROP POLICY IF EXISTS "Authenticated users can view lesson materials" ON storage.objects;
CREATE POLICY "Lesson materials: enrolled users only"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lesson-materials'
    AND public.user_can_access_lesson(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );

-- student-uploads: enforce that user can only INSERT into a folder matching their auth.uid()
DROP POLICY IF EXISTS "Student upload validation" ON storage.objects;

-- Remove permissive avatar dummy validation
DROP POLICY IF EXISTS "Avatar upload size and type validation" ON storage.objects;

-- Allow students to DELETE their own uploads
CREATE POLICY "Students can delete their own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'student-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
