
-- Taak 2.1: Add notification preference columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lesson_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exercise_notifications boolean NOT NULL DEFAULT true;

-- Taak 3.4: Add missing performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_class_published ON public.exercises(class_id, is_published);
CREATE INDEX IF NOT EXISTS idx_chat_messages_class_id ON public.chat_messages(class_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_student ON public.exercise_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_student ON public.lesson_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON public.points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_room ON public.forum_posts(room_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON public.student_answers(exercise_attempt_id);
