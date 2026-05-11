-- Fix: Remove student self-write permission from user_points UPDATE policy
DROP POLICY IF EXISTS "System can update points" ON public.user_points;

CREATE POLICY "Admins and teachers can update points"
  ON public.user_points
  FOR UPDATE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
  );