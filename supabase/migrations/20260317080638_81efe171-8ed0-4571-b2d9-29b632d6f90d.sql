
-- Allow students to request enrollment (self-service with pending status)
CREATE POLICY "Students can request enrollment"
ON public.class_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND status IN ('pending', 'enrolled')
);

-- Allow students to view their own enrollments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'class_enrollments' 
    AND policyname = 'Students can view own enrollments'
  ) THEN
    CREATE POLICY "Students can view own enrollments"
    ON public.class_enrollments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);
  END IF;
END $$;

-- Allow admins to manage all enrollments (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'class_enrollments' 
    AND policyname = 'Admins can manage all enrollments'
  ) THEN
    CREATE POLICY "Admins can manage all enrollments"
    ON public.class_enrollments
    FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
