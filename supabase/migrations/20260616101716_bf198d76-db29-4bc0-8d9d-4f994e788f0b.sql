-- ============================================================
-- Curriculum schema voor Huis van het Arabisch (Pad A)
-- ============================================================

-- Enum voor oefentypes
DO $$ BEGIN
  CREATE TYPE public.curriculum_exercise_type AS ENUM (
    'meerkeuze','meerdere-antwoorden','open-tekst','gatentekst',
    'bestand-upload','audio-opname','rangschikken','koppelen'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====================== UNITS ======================
CREATE TABLE IF NOT EXISTS public.curriculum_units (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,                -- 'U1'..'U25'
  display_order   smallint NOT NULL,
  title_nl        text NOT NULL DEFAULT '',
  title_en        text NOT NULL DEFAULT '',
  title_ar        text NOT NULL DEFAULT '',
  cefr_from       text NOT NULL DEFAULT '',
  cefr_to         text NOT NULL DEFAULT '',
  description_nl  text NOT NULL DEFAULT '',
  week_start      smallint,
  week_end        smallint,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.curriculum_units TO anon, authenticated;
GRANT ALL ON public.curriculum_units TO service_role;

ALTER TABLE public.curriculum_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan units lezen"
  ON public.curriculum_units FOR SELECT
  USING (true);

CREATE POLICY "Admins beheren units"
  ON public.curriculum_units FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_curriculum_units_updated
  BEFORE UPDATE ON public.curriculum_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================== ITEMS ======================
CREATE TABLE IF NOT EXISTS public.curriculum_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id                  text NOT NULL UNIQUE,           -- 'U1-lezen-01'
  unit_code                text NOT NULL REFERENCES public.curriculum_units(code) ON UPDATE CASCADE,
  week                     smallint NOT NULL,
  skill                    text NOT NULL,
  exercise_type            public.curriculum_exercise_type NOT NULL,
  exercise_subtype         text NOT NULL DEFAULT '',
  display_order            integer NOT NULL DEFAULT 0,

  instruction_nl           text NOT NULL DEFAULT '',
  question                 text NOT NULL DEFAULT '',

  options                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer           text NOT NULL DEFAULT '',
  correct_options          jsonb,

  feedback_correct         text NOT NULL DEFAULT '',
  feedback_incorrect       text NOT NULL DEFAULT '',

  input_arabic             text NOT NULL DEFAULT '',
  input_transliteration    text NOT NULL DEFAULT '',
  input_translation_nl     text NOT NULL DEFAULT '',

  reference_media          text NOT NULL DEFAULT '',
  media_production         jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_url                text,           -- audio/beeld in curriculum-media bucket
  media_alt                text,

  points                   smallint NOT NULL DEFAULT 1,
  review_flag              text NOT NULL DEFAULT '',
  is_published             boolean NOT NULL DEFAULT true,

  needs_ns_audio           boolean GENERATED ALWAYS AS (media_production ? 'NS-audio') STORED,
  needs_student_recording  boolean GENERATED ALWAYS AS (media_production ? 'student-opname') STORED,
  needs_image              boolean GENERATED ALWAYS AS (media_production ? 'beeld') STORED,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curritems_unit   ON public.curriculum_items(unit_code);
CREATE INDEX IF NOT EXISTS idx_curritems_week   ON public.curriculum_items(week);
CREATE INDEX IF NOT EXISTS idx_curritems_skill  ON public.curriculum_items(skill);
CREATE INDEX IF NOT EXISTS idx_curritems_type   ON public.curriculum_items(exercise_type);

GRANT SELECT ON public.curriculum_items TO authenticated;
GRANT ALL ON public.curriculum_items TO service_role;

ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;

-- Helper: heeft gebruiker leestoegang tot curriculum?
CREATE OR REPLACE FUNCTION public.can_access_curriculum(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id,'admin')
    OR public.has_role(_user_id,'teacher')
    OR EXISTS (
      SELECT 1 FROM public.class_enrollments ce
      WHERE ce.student_id = _user_id AND ce.status = 'enrolled'
    )
    OR public.has_active_subscription(_user_id,'live')
    OR public.has_active_subscription(_user_id,'sandbox');
$$;

CREATE POLICY "Toegang tot curriculum-items"
  ON public.curriculum_items FOR SELECT
  USING (is_published AND public.can_access_curriculum(auth.uid()));

CREATE POLICY "Admins beheren items"
  ON public.curriculum_items FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_curriculum_items_updated
  BEFORE UPDATE ON public.curriculum_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================== ATTEMPTS ======================
CREATE TABLE IF NOT EXISTS public.curriculum_item_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
  answer_text     text,
  answer_json     jsonb,
  upload_path     text,           -- voor bestand-upload / audio-opname
  is_correct      boolean,
  score           smallint NOT NULL DEFAULT 0,
  max_score       smallint NOT NULL DEFAULT 0,
  time_spent_sec  integer,
  feedback_shown  text,
  attempt_number  smallint NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_attempts_student ON public.curriculum_item_attempts(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_attempts_item    ON public.curriculum_item_attempts(item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_item_attempts TO authenticated;
GRANT ALL ON public.curriculum_item_attempts TO service_role;

ALTER TABLE public.curriculum_item_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leerlingen zien eigen pogingen"
  ON public.curriculum_item_attempts FOR SELECT
  USING (student_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'teacher'));

CREATE POLICY "Leerlingen maken eigen pogingen"
  ON public.curriculum_item_attempts FOR INSERT
  WITH CHECK (student_id = auth.uid() AND public.can_access_curriculum(auth.uid()));

CREATE POLICY "Leerlingen updaten eigen pogingen"
  ON public.curriculum_item_attempts FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins beheren pogingen"
  ON public.curriculum_item_attempts FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ====================== PROGRESS (aggregaat) ======================
CREATE TABLE IF NOT EXISTS public.curriculum_progress (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_code           text NOT NULL REFERENCES public.curriculum_units(code) ON UPDATE CASCADE,
  items_completed     integer NOT NULL DEFAULT 0,
  items_correct       integer NOT NULL DEFAULT 0,
  total_points        integer NOT NULL DEFAULT 0,
  last_activity_at    timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, unit_code)
);

GRANT SELECT, INSERT, UPDATE ON public.curriculum_progress TO authenticated;
GRANT ALL ON public.curriculum_progress TO service_role;

ALTER TABLE public.curriculum_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leerlingen zien eigen voortgang"
  ON public.curriculum_progress FOR SELECT
  USING (student_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'teacher'));

CREATE POLICY "Leerlingen updaten eigen voortgang"
  ON public.curriculum_progress FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Leerlingen wijzigen eigen voortgang"
  ON public.curriculum_progress FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins beheren voortgang"
  ON public.curriculum_progress FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_curriculum_progress_updated
  BEFORE UPDATE ON public.curriculum_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed lege units U1..U25 (U16 leeg). Titels/CEFR worden later geseed.
INSERT INTO public.curriculum_units (code, display_order)
SELECT 'U'||g, g FROM generate_series(1,25) g
ON CONFLICT (code) DO NOTHING;
