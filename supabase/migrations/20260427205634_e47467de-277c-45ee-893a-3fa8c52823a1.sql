CREATE TABLE IF NOT EXISTS public.user_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role app_role NOT NULL,
  dismissed boolean NOT NULL DEFAULT false,
  completed_steps text[] NOT NULL DEFAULT '{}',
  dismissed_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding state"
ON public.user_onboarding_state FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own onboarding state"
ON public.user_onboarding_state FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding state"
ON public.user_onboarding_state FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.learning_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  reason text NOT NULL,
  priority integer NOT NULL DEFAULT 50,
  source text NOT NULL DEFAULT 'rule_based',
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id, exercise_id, source)
);

ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own recommendations"
ON public.learning_recommendations FOR SELECT TO authenticated
USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can update own recommendation status"
ON public.learning_recommendations FOR UPDATE TO authenticated
USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
WITH CHECK (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Staff can create recommendations"
ON public.learning_recommendations FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE TABLE IF NOT EXISTS public.feedback_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view rubrics"
ON public.feedback_rubrics FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Staff can create own rubrics"
ON public.feedback_rubrics FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')) AND auth.uid() = owner_id);

CREATE POLICY "Staff can update own rubrics or admins update all"
ON public.feedback_rubrics FOR UPDATE TO authenticated
USING ((auth.uid() = owner_id AND public.has_role(auth.uid(), 'teacher')) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK ((auth.uid() = owner_id AND public.has_role(auth.uid(), 'teacher')) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.feedback_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view feedback templates"
ON public.feedback_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Staff can create own feedback templates"
ON public.feedback_templates FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')) AND auth.uid() = owner_id);

CREATE POLICY "Staff can update own feedback templates or admins update all"
ON public.feedback_templates FOR UPDATE TO authenticated
USING ((auth.uid() = owner_id AND public.has_role(auth.uid(), 'teacher')) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK ((auth.uid() = owner_id AND public.has_role(auth.uid(), 'teacher')) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.submission_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_answer_id uuid NOT NULL,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  rubric_id uuid,
  template_id uuid,
  rubric_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback_text text NOT NULL,
  status text NOT NULL DEFAULT 'published',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_answer_id)
);

ALTER TABLE public.submission_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own submission feedback"
ON public.submission_feedback FOR SELECT TO authenticated
USING (auth.uid() = student_id OR auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can create submission feedback"
ON public.submission_feedback FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')) AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own submission feedback"
ON public.submission_feedback FOR UPDATE TO authenticated
USING ((auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher')) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK ((auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher')) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  title text NOT NULL,
  message text NOT NULL,
  related_table text,
  related_id uuid,
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification events"
ON public.notification_events FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can create notification events"
ON public.notification_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Users can update own notification event status"
ON public.notification_events FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON public.user_onboarding_state(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_recommendations_student ON public.learning_recommendations(student_id, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_submission_feedback_student ON public.submission_feedback(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_feedback_teacher ON public.submission_feedback(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_due ON public.notification_events(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id, created_at DESC);

CREATE TRIGGER update_user_onboarding_state_updated_at
BEFORE UPDATE ON public.user_onboarding_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_recommendations_updated_at
BEFORE UPDATE ON public.learning_recommendations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_rubrics_updated_at
BEFORE UPDATE ON public.feedback_rubrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_templates_updated_at
BEFORE UPDATE ON public.feedback_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submission_feedback_updated_at
BEFORE UPDATE ON public.submission_feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_events_updated_at
BEFORE UPDATE ON public.notification_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.create_notification_event(
  p_user_id uuid,
  p_event_type text,
  p_channel text,
  p_title text,
  p_message text,
  p_related_table text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL,
  p_scheduled_for timestamp with time zone DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.notification_events (
    user_id, event_type, channel, title, message,
    related_table, related_id, scheduled_for, metadata
  ) VALUES (
    p_user_id, p_event_type, p_channel, p_title, p_message,
    p_related_table, p_related_id, p_scheduled_for, p_metadata
  ) RETURNING id INTO v_event_id;

  IF p_channel = 'in_app' THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (p_user_id, p_event_type, p_title, p_message, p_related_id);

    UPDATE public.notification_events
    SET status = 'sent', sent_at = now()
    WHERE id = v_event_id;
  END IF;

  RETURN v_event_id;
END;
$$;