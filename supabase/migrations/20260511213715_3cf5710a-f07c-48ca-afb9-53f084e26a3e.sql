DROP POLICY IF EXISTS "Anyone can view questions for active exams" ON public.final_exam_questions;

CREATE POLICY "Enrolled students and staff can view exam questions"
  ON public.final_exam_questions
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.final_exams fe
      JOIN public.classes c ON c.level_id = fe.level_id
      JOIN public.class_enrollments ce ON ce.class_id = c.id
      WHERE fe.id = final_exam_questions.final_exam_id
        AND fe.is_active = true
        AND ce.student_id = auth.uid()
        AND ce.status = 'enrolled'
    )
  );