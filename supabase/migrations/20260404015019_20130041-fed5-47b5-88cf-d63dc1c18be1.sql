
CREATE OR REPLACE FUNCTION public.get_user_with_context(_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'role', (
      SELECT role FROM public.user_roles 
      WHERE user_id = _user_id 
      ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'teacher' THEN 2 WHEN 'student' THEN 3 END 
      LIMIT 1
    ),
    'profile', (
      SELECT row_to_json(p) FROM (
        SELECT id, user_id, email, full_name, phone, address, date_of_birth, 
               study_level, avatar_url, preferred_language, preferred_theme,
               email_notifications, lesson_reminders, exercise_notifications
        FROM public.profiles WHERE user_id = _user_id LIMIT 1
      ) p
    )
  )
$$;
