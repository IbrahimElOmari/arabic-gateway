
CREATE OR REPLACE FUNCTION public.promote_student_to_next_level(p_student_id uuid, p_current_level_id uuid, p_exam_attempt_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    v_current_order INTEGER;
    v_next_level_id UUID;
    v_next_class_id UUID;
    v_exam_passed BOOLEAN;
    v_exam_student UUID;
    v_max_students INTEGER;
    v_current_enrollment INTEGER;
BEGIN
    -- Authorization: only admin or teacher may call this
    IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher')) THEN
        RAISE EXCEPTION 'Unauthorized: only admin or teacher can promote students';
    END IF;

    -- Validate exam attempt belongs to the student and was passed
    SELECT passed, student_id INTO v_exam_passed, v_exam_student
    FROM public.final_exam_attempts
    WHERE id = p_exam_attempt_id;

    IF v_exam_student IS NULL THEN
        RAISE EXCEPTION 'Exam attempt not found';
    END IF;

    IF v_exam_student != p_student_id THEN
        RAISE EXCEPTION 'Exam attempt does not belong to the specified student';
    END IF;

    IF v_exam_passed IS NOT TRUE THEN
        RAISE EXCEPTION 'Exam was not passed';
    END IF;

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
        -- Check class capacity before enrolling
        SELECT max_students INTO v_max_students
        FROM public.classes
        WHERE id = v_next_class_id;

        SELECT COUNT(*) INTO v_current_enrollment
        FROM public.class_enrollments
        WHERE class_id = v_next_class_id
        AND status = 'enrolled';

        IF v_max_students IS NOT NULL AND v_current_enrollment >= v_max_students THEN
            -- Class is full; mark promotion but skip auto-enrollment
            UPDATE public.final_exam_attempts
            SET promoted_to_level_id = v_next_level_id
            WHERE id = p_exam_attempt_id;

            PERFORM public.award_points(
                p_student_id, 
                'level_completed'::points_action, 
                500,
                p_current_level_id,
                'level'
            );

            RETURN v_next_level_id;
        END IF;

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
