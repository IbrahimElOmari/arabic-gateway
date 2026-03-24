
-- Fix exercises RLS: only 'enrolled' students can view (not 'pending')
DROP POLICY IF EXISTS "Enrolled students can view published exercises" ON public.exercises;
CREATE POLICY "Enrolled students can view published exercises"
ON public.exercises FOR SELECT
USING (
  (
    is_published = true
    AND release_date <= now()
    AND EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = exercises.class_id
        AND class_enrollments.student_id = auth.uid()
        AND class_enrollments.status = 'enrolled'
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- Fix lessons RLS: only 'enrolled' students can view
DROP POLICY IF EXISTS "Enrolled students can view lessons" ON public.lessons;
CREATE POLICY "Enrolled students can view lessons"
ON public.lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM class_enrollments
    WHERE class_enrollments.class_id = lessons.class_id
      AND class_enrollments.student_id = auth.uid()
      AND class_enrollments.status = 'enrolled'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- Fix chat_reactions RLS: only enrolled students
DROP POLICY IF EXISTS "Users can view reactions in their chats" ON public.chat_reactions;
CREATE POLICY "Users can view reactions in their chats"
ON public.chat_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_messages cm
    JOIN class_enrollments ce ON ce.class_id = cm.class_id
    WHERE cm.id = chat_reactions.message_id
      AND ce.student_id = auth.uid()
      AND ce.status = 'enrolled'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);
