CREATE POLICY "Students can create own recommendations"
ON public.learning_recommendations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id AND source = 'rule_based');

REVOKE EXECUTE ON FUNCTION public.create_notification_event(uuid, text, text, text, text, text, uuid, timestamp with time zone, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification_event(uuid, text, text, text, text, text, uuid, timestamp with time zone, jsonb) TO authenticated;