-- Final Exams System for Level Progression

-- Table for final exams linked to levels
CREATE TABLE public.final_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER NOT NULL DEFAULT 70,
    time_limit_seconds INTEGER,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for final exam attempts
CREATE TABLE public.final_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_exam_id UUID NOT NULL REFERENCES public.final_exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    total_score NUMERIC,
    passed BOOLEAN,
    promoted_to_level_id UUID REFERENCES public.levels(id),
    UNIQUE(final_exam_id, student_id, attempt_number)
);

-- Final exam questions (linked to final_exams, separate from exercise questions)
CREATE TABLE public.final_exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_exam_id UUID NOT NULL REFERENCES public.final_exams(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'multiple_choice',
    question_text JSONB NOT NULL,
    options JSONB,
    correct_answer JSONB,
    points INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.final_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exam_questions ENABLE ROW LEVEL SECURITY;

-- RLS for final_exams
CREATE POLICY "Anyone can view active final exams"
    ON public.final_exams FOR SELECT
    USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and teachers can manage final exams"
    ON public.final_exams FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- RLS for final_exam_attempts
CREATE POLICY "Students can view their own attempts"
    ON public.final_exam_attempts FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own attempts"
    ON public.final_exam_attempts FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own attempts"
    ON public.final_exam_attempts FOR UPDATE
    USING (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can view all attempts"
    ON public.final_exam_attempts FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- RLS for final_exam_questions
CREATE POLICY "Anyone can view questions for active exams"
    ON public.final_exam_questions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.final_exams 
        WHERE id = final_exam_questions.final_exam_id 
        AND (is_active = true OR has_role(auth.uid(), 'admin'::app_role))
    ));

CREATE POLICY "Admins and teachers can manage questions"
    ON public.final_exam_questions FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_final_exams_updated_at
    BEFORE UPDATE ON public.final_exams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function for level promotion
CREATE OR REPLACE FUNCTION public.promote_student_to_next_level(
    p_student_id UUID,
    p_current_level_id UUID,
    p_exam_attempt_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_order INTEGER;
    v_next_level_id UUID;
    v_next_class_id UUID;
BEGIN
    -- Get current level order
    SELECT display_order INTO v_current_order
    FROM public.levels
    WHERE id = p_current_level_id;
    
    -- Get next level
    SELECT id INTO v_next_level_id
    FROM public.levels
    WHERE display_order = v_current_order + 1
    ORDER BY display_order
    LIMIT 1;
    
    IF v_next_level_id IS NULL THEN
        -- Highest level reached
        RETURN NULL;
    END IF;
    
    -- Find active class in next level
    SELECT id INTO v_next_class_id
    FROM public.classes
    WHERE level_id = v_next_level_id
    AND is_active = true
    ORDER BY start_date DESC
    LIMIT 1;
    
    IF v_next_class_id IS NOT NULL THEN
        -- Enroll student in new class
        INSERT INTO public.class_enrollments (student_id, class_id, status)
        VALUES (p_student_id, v_next_class_id, 'enrolled')
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Update exam attempt with promotion
    UPDATE public.final_exam_attempts
    SET promoted_to_level_id = v_next_level_id
    WHERE id = p_exam_attempt_id;
    
    -- Award points for level completion
    PERFORM public.award_points(
        p_student_id, 
        'level_completed'::points_action, 
        500,
        p_current_level_id,
        'level'
    );
    
    RETURN v_next_level_id;
END;
$$;