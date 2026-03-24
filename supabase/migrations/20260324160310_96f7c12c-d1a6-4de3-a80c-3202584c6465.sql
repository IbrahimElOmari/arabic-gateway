-- chat_reactions INSERT: require enrolled status for students
-- Without this, pending students could add reactions to messages they can't even see
DROP POLICY IF EXISTS "Users can add their own reactions" ON public.chat_reactions;
CREATE POLICY "Users can add their own reactions"
ON public.chat_reactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    (EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN class_enrollments ce ON ce.class_id = cm.class_id
      WHERE cm.id = chat_reactions.message_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'enrolled'
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.id = chat_reactions.message_id
        AND c.teacher_id = auth.uid()
    ))
  )
);