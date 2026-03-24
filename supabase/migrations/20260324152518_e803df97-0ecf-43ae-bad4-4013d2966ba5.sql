-- Fix chat_messages SELECT: require enrolled status (pending students blocked)
DROP POLICY IF EXISTS "Enrolled students can view class chat" ON public.chat_messages;
CREATE POLICY "Enrolled students can view class chat"
ON public.chat_messages FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM class_enrollments
    WHERE class_enrollments.class_id = chat_messages.class_id
      AND class_enrollments.student_id = auth.uid()
      AND class_enrollments.status = 'enrolled'
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = chat_messages.class_id
      AND classes.teacher_id = auth.uid()
  ))
);

-- Fix chat_messages INSERT: require enrolled status
DROP POLICY IF EXISTS "Enrolled users can send chat messages" ON public.chat_messages;
CREATE POLICY "Enrolled users can send chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    (EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = chat_messages.class_id
        AND class_enrollments.student_id = auth.uid()
        AND class_enrollments.status = 'enrolled'
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = chat_messages.class_id
        AND classes.teacher_id = auth.uid()
    ))
  )
);

-- Remove duplicate SELECT policy on class_enrollments
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.class_enrollments;