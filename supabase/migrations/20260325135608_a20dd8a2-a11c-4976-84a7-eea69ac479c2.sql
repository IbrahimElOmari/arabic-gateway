
CREATE OR REPLACE FUNCTION public.count_unassigned_students()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_roles ur
  WHERE ur.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.class_enrollments ce
    WHERE ce.student_id = ur.user_id
  )
$$;
