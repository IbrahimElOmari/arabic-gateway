ALTER TABLE public.curriculum_units ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES public.levels(id);
UPDATE public.curriculum_units SET level_id = 'ea031f12-0114-4867-b8a2-e4fbdb4be2f1' WHERE level_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_curriculum_units_level_id ON public.curriculum_units(level_id);

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS curriculum_all_unlocked boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.class_curriculum_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  unit_code text NOT NULL REFERENCES public.curriculum_units(code) ON DELETE CASCADE,
  is_unlocked boolean NOT NULL DEFAULT false,
  unlock_date timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_class_unit UNIQUE (class_id, unit_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_curriculum_schedules TO authenticated;
GRANT ALL ON public.class_curriculum_schedules TO service_role;
ALTER TABLE public.class_curriculum_schedules ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_class(_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = _class_id AND c.teacher_id = auth.uid());
$$;

CREATE POLICY "Staff manage class schedules" ON public.class_curriculum_schedules
  FOR ALL TO authenticated USING (public.can_manage_class(class_id)) WITH CHECK (public.can_manage_class(class_id));
CREATE POLICY "Students read own class schedules" ON public.class_curriculum_schedules
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.class_enrollments ce WHERE ce.class_id = class_curriculum_schedules.class_id AND ce.student_id = auth.uid() AND ce.status = 'enrolled'));

CREATE TRIGGER update_class_curriculum_schedules_updated_at BEFORE UPDATE ON public.class_curriculum_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.init_class_curriculum_schedule(_class_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_level uuid; v_start date; v_count int;
BEGIN
  SELECT level_id, COALESCE(start_date, current_date) INTO v_level, v_start FROM public.classes WHERE id = _class_id;
  IF v_level IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.class_curriculum_schedules (class_id, unit_code, is_unlocked, unlock_date)
  SELECT _class_id, u.code,
         (rn = 1),
         (v_start + ((rn - 1) * 7)::int)::timestamptz
  FROM (SELECT code, row_number() OVER (ORDER BY display_order) AS rn FROM public.curriculum_units WHERE level_id = v_level) u
  ON CONFLICT (class_id, unit_code) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_init_class_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.init_class_curriculum_schedule(NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_class_created_init_schedule AFTER INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.trg_init_class_schedule();

SELECT public.init_class_curriculum_schedule(id) FROM public.classes;

CREATE OR REPLACE FUNCTION public.curriculum_unit_accessible(_user_id uuid, _unit_code text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_class uuid; v_all boolean; s record;
BEGIN
  IF public.has_role(_user_id,'admin'::app_role) OR public.has_role(_user_id,'teacher'::app_role) THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM public.curriculum_item_attempts a JOIN public.curriculum_items ci ON ci.id = a.item_id
             WHERE a.student_id = _user_id AND ci.unit_code = _unit_code) THEN RETURN true; END IF;
  SELECT ce.class_id, c.curriculum_all_unlocked INTO v_class, v_all
    FROM public.class_enrollments ce JOIN public.classes c ON c.id = ce.class_id
    JOIN public.curriculum_units u ON u.code = _unit_code AND u.level_id = c.level_id
    WHERE ce.student_id = _user_id AND ce.status = 'enrolled'
    ORDER BY ce.enrolled_at DESC LIMIT 1;
  IF v_class IS NULL THEN
    RETURN NOT EXISTS (SELECT 1 FROM public.class_enrollments WHERE student_id = _user_id AND status = 'enrolled');
  END IF;
  IF v_all THEN RETURN true; END IF;
  SELECT is_unlocked, unlock_date INTO s FROM public.class_curriculum_schedules WHERE class_id = v_class AND unit_code = _unit_code;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN s.is_unlocked OR (s.unlock_date IS NOT NULL AND s.unlock_date <= now());
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_accessible_units()
RETURNS TABLE(unit_code text, level_id uuid, is_accessible boolean, unlock_date timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_class uuid; v_level uuid; v_staff boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  v_staff := public.has_role(v_uid,'admin'::app_role) OR public.has_role(v_uid,'teacher'::app_role);
  SELECT ce.class_id, c.level_id INTO v_class, v_level
    FROM public.class_enrollments ce JOIN public.classes c ON c.id = ce.class_id
    WHERE ce.student_id = v_uid AND ce.status = 'enrolled'
    ORDER BY ce.enrolled_at DESC LIMIT 1;
  IF v_level IS NULL THEN
    SELECT id INTO v_level FROM public.levels ORDER BY display_order LIMIT 1;
  END IF;
  RETURN QUERY
  SELECT u.code, u.level_id,
         public.curriculum_unit_accessible(v_uid, u.code),
         s.unlock_date
  FROM public.curriculum_units u
  LEFT JOIN public.class_curriculum_schedules s ON s.class_id = v_class AND s.unit_code = u.code
  WHERE v_staff OR u.level_id = v_level
     OR EXISTS (SELECT 1 FROM public.curriculum_item_attempts a JOIN public.curriculum_items ci ON ci.id = a.item_id
                WHERE a.student_id = v_uid AND ci.unit_code = u.code)
  ORDER BY u.display_order;
END; $$;

CREATE OR REPLACE FUNCTION public.unlock_next_class_unit(_class_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_code text;
BEGIN
  IF NOT public.can_manage_class(_class_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT s.unit_code INTO v_code FROM public.class_curriculum_schedules s
    JOIN public.curriculum_units u ON u.code = s.unit_code
    WHERE s.class_id = _class_id AND NOT s.is_unlocked AND (s.unlock_date IS NULL OR s.unlock_date > now())
    ORDER BY u.display_order LIMIT 1;
  IF v_code IS NULL THEN RETURN NULL; END IF;
  UPDATE public.class_curriculum_schedules SET is_unlocked = true WHERE class_id = _class_id AND unit_code = v_code;
  RETURN v_code;
END; $$;

CREATE OR REPLACE FUNCTION public.shift_class_schedule(_class_id uuid, _days integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_n int;
BEGIN
  IF NOT public.can_manage_class(_class_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _days < -60 OR _days > 60 THEN RAISE EXCEPTION 'invalid shift'; END IF;
  UPDATE public.class_curriculum_schedules
    SET unlock_date = unlock_date + make_interval(days => _days)
    WHERE class_id = _class_id AND NOT is_unlocked AND unlock_date > now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_curriculum_attempt(p_item_id uuid, p_answer_text text DEFAULT NULL::text, p_answer_json jsonb DEFAULT NULL::jsonb, p_upload_path text DEFAULT NULL::text, p_time_spent_sec integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_type text; v_correct_answer text; v_correct_options jsonb; v_options jsonb;
  v_strict boolean; v_points smallint; v_published boolean; v_fb_ok text; v_fb_no text;
  v_is_correct boolean; v_score smallint; v_attempt_no smallint; v_attempt_id uuid; v_unit text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  SELECT ci.exercise_type::text, ci.correct_answer, ci.correct_options, ci.options,
         ci.strict_tashkeel, ci.points, ci.is_published, ci.feedback_correct, ci.feedback_incorrect, ci.unit_code
    INTO v_type, v_correct_answer, v_correct_options, v_options,
         v_strict, v_points, v_published, v_fb_ok, v_fb_no, v_unit
  FROM public.curriculum_items ci
  WHERE ci.id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oefening niet gevonden';
  END IF;

  IF NOT (v_published AND public.can_access_curriculum(v_uid)) THEN
    RAISE EXCEPTION 'Geen toegang tot deze oefening';
  END IF;

  IF NOT public.curriculum_unit_accessible(v_uid, v_unit) THEN
    RAISE EXCEPTION 'Deze week is nog niet vrijgegeven voor jouw klas';
  END IF;

  IF v_type IN ('bestand-upload','audio-opname') THEN
    IF p_upload_path IS NULL OR p_upload_path = '' THEN
      RAISE EXCEPTION 'Upload of opname vereist';
    END IF;
    v_is_correct := true;
  ELSIF v_type = 'open-tekst' THEN
    v_is_correct := NULL;
  ELSE
    v_is_correct := public.cm_grade_answer(
      v_type, v_correct_answer, v_correct_options, v_options, v_strict,
      p_answer_text, p_answer_json);
  END IF;

  v_score := CASE WHEN v_is_correct IS TRUE THEN v_points ELSE 0 END;

  SELECT COALESCE(max(attempt_number),0) + 1 INTO v_attempt_no
  FROM public.curriculum_item_attempts
  WHERE student_id = v_uid AND item_id = p_item_id;

  INSERT INTO public.curriculum_item_attempts
    (student_id, item_id, answer_text, answer_json, upload_path,
     is_correct, score, max_score, attempt_number, time_spent_sec)
  VALUES
    (v_uid, p_item_id, p_answer_text, p_answer_json, p_upload_path,
     v_is_correct, v_score, v_points, v_attempt_no, p_time_spent_sec)
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'is_correct', v_is_correct,
    'pending', (v_is_correct IS NULL),
    'score', v_score,
    'max_score', v_points,
    'attempt_number', v_attempt_no,
    'feedback', CASE WHEN v_is_correct IS TRUE THEN v_fb_ok
                     WHEN v_is_correct IS FALSE THEN v_fb_no
                     ELSE '' END,
    'correct_answer',  CASE WHEN v_is_correct IS FALSE THEN v_correct_answer  ELSE NULL END,
    'correct_options', CASE WHEN v_is_correct IS FALSE THEN v_correct_options ELSE NULL END
  );
END;
$function$;