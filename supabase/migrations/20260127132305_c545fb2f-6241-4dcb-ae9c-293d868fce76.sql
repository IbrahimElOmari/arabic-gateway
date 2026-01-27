-- =============================================
-- ENUMS
-- =============================================

-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('pending', 'active', 'past_due', 'canceled', 'paused');

-- Payment plan type enum
CREATE TYPE public.plan_type AS ENUM ('one_time', 'subscription', 'installment');

-- Payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- Payment method enum
CREATE TYPE public.payment_method AS ENUM ('stripe', 'manual', 'cash', 'bank_transfer');

-- Discount type enum
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed_amount');

-- Lesson status enum
CREATE TYPE public.lesson_status AS ENUM ('scheduled', 'in_progress', 'completed', 'canceled');

-- Exercise category enum
CREATE TYPE public.exercise_category AS ENUM ('reading', 'writing', 'listening', 'speaking', 'grammar');

-- Question type enum
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'checkbox', 'open_text', 'audio_upload', 'video_upload', 'file_upload');

-- Teacher application status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- =============================================
-- PAYMENT TABLES
-- =============================================

-- Installment plans
CREATE TABLE public.installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    total_installments INTEGER NOT NULL CHECK (total_installments > 0),
    interval_months INTEGER NOT NULL DEFAULT 1 CHECK (interval_months > 0),
    description JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Subscriptions
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status public.subscription_status DEFAULT 'pending' NOT NULL,
    plan_type public.plan_type DEFAULT 'one_time' NOT NULL,
    installment_plan_id UUID REFERENCES public.installment_plans(id),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    stripe_payment_intent_id TEXT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT DEFAULT 'EUR' NOT NULL,
    status public.payment_status DEFAULT 'pending' NOT NULL,
    payment_method public.payment_method DEFAULT 'stripe' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Discount codes
CREATE TABLE public.discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type public.discount_type NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0 NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- LESSON TABLES
-- =============================================

-- Lesson themes
CREATE TABLE public.lesson_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_nl TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Lessons
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES public.lesson_themes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 90 NOT NULL CHECK (duration_minutes > 0),
    meet_link TEXT,
    status public.lesson_status DEFAULT 'scheduled' NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Lesson recordings
CREATE TABLE public.lesson_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Lesson materials
CREATE TABLE public.lesson_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    recording_id UUID REFERENCES public.lesson_recordings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Lesson attendance
CREATE TABLE public.lesson_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    attended BOOLEAN DEFAULT false NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(lesson_id, student_id)
);

-- =============================================
-- EXERCISE TABLES
-- =============================================

-- Exercise categories
CREATE TABLE public.exercise_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name public.exercise_category UNIQUE NOT NULL,
    name_nl TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Exercises
CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.exercise_categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    instructions JSONB DEFAULT '{}',
    release_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    time_limit_seconds INTEGER,
    is_published BOOLEAN DEFAULT false NOT NULL,
    max_attempts INTEGER DEFAULT 1 NOT NULL CHECK (max_attempts > 0),
    passing_score INTEGER DEFAULT 60 NOT NULL CHECK (passing_score >= 0 AND passing_score <= 100),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Questions
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    type public.question_type NOT NULL,
    question_text JSONB NOT NULL,
    media_url TEXT,
    options JSONB,
    correct_answer JSONB,
    points INTEGER DEFAULT 1 NOT NULL CHECK (points > 0),
    time_limit_seconds INTEGER,
    display_order INTEGER DEFAULT 0 NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Exercise attempts
CREATE TABLE public.exercise_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    attempt_number INTEGER DEFAULT 1 NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    total_score DECIMAL(5, 2),
    passed BOOLEAN,
    time_spent_seconds INTEGER DEFAULT 0 NOT NULL,
    UNIQUE(exercise_id, student_id, attempt_number)
);

-- Student answers
CREATE TABLE public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    exercise_attempt_id UUID NOT NULL REFERENCES public.exercise_attempts(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_data JSONB,
    file_url TEXT,
    is_correct BOOLEAN,
    score DECIMAL(5, 2),
    feedback TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Student progress
CREATE TABLE public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.exercise_categories(id) ON DELETE CASCADE,
    exercises_completed INTEGER DEFAULT 0 NOT NULL,
    exercises_total INTEGER DEFAULT 0 NOT NULL,
    average_score DECIMAL(5, 2) DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(student_id, class_id, category_id)
);

-- =============================================
-- ADMIN TABLES
-- =============================================

-- Teacher applications
CREATE TABLE public.teacher_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    status public.application_status DEFAULT 'pending' NOT NULL,
    qualifications TEXT,
    experience TEXT,
    requested_levels UUID[],
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Admin activity log
CREATE TABLE public.admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_installment_plans_updated_at
    BEFORE UPDATE ON public.installment_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_themes_updated_at
    BEFORE UPDATE ON public.lesson_themes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON public.exercises
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_progress_updated_at
    BEFORE UPDATE ON public.student_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Installment plans: Anyone can view, admins can manage
CREATE POLICY "Anyone can view active installment plans" ON public.installment_plans
    FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage installment plans" ON public.installment_plans
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payments" ON public.payments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Discount codes
CREATE POLICY "Anyone can view active discount codes" ON public.discount_codes
    FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Admins can manage discount codes" ON public.discount_codes
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lesson themes
CREATE POLICY "Anyone can view lesson themes" ON public.lesson_themes
    FOR SELECT USING (true);

CREATE POLICY "Teachers and admins can manage lesson themes" ON public.lesson_themes
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Lessons
CREATE POLICY "Enrolled students can view lessons" ON public.lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_enrollments 
            WHERE class_enrollments.class_id = lessons.class_id 
            AND class_enrollments.student_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'teacher')
    );

CREATE POLICY "Teachers can manage lessons for their classes" ON public.lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.classes 
            WHERE classes.id = lessons.class_id 
            AND classes.teacher_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classes 
            WHERE classes.id = lessons.class_id 
            AND classes.teacher_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    );

-- Lesson recordings
CREATE POLICY "Enrolled students can view recordings" ON public.lesson_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.class_enrollments ce ON ce.class_id = l.class_id
            WHERE l.id = lesson_recordings.lesson_id 
            AND ce.student_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'teacher')
    );

CREATE POLICY "Teachers can manage recordings" ON public.lesson_recordings
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Lesson materials
CREATE POLICY "Enrolled students can view materials" ON public.lesson_materials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.class_enrollments ce ON ce.class_id = l.class_id
            WHERE l.id = lesson_materials.lesson_id 
            AND ce.student_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'teacher')
    );

CREATE POLICY "Teachers can manage materials" ON public.lesson_materials
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Lesson attendance
CREATE POLICY "Students can view their own attendance" ON public.lesson_attendance
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can manage attendance" ON public.lesson_attendance
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Exercise categories
CREATE POLICY "Anyone can view exercise categories" ON public.exercise_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage exercise categories" ON public.exercise_categories
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Exercises
CREATE POLICY "Enrolled students can view published exercises" ON public.exercises
    FOR SELECT USING (
        (is_published = true AND release_date <= now() AND EXISTS (
            SELECT 1 FROM public.class_enrollments 
            WHERE class_enrollments.class_id = exercises.class_id 
            AND class_enrollments.student_id = auth.uid()
        ))
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'teacher')
    );

CREATE POLICY "Teachers can manage exercises for their classes" ON public.exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.classes 
            WHERE classes.id = exercises.class_id 
            AND classes.teacher_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classes 
            WHERE classes.id = exercises.class_id 
            AND classes.teacher_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    );

-- Questions
CREATE POLICY "Students can view questions for accessible exercises" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.exercises e
            JOIN public.class_enrollments ce ON ce.class_id = e.class_id
            WHERE e.id = questions.exercise_id 
            AND ce.student_id = auth.uid()
            AND e.is_published = true
        )
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'teacher')
    );

CREATE POLICY "Teachers can manage questions" ON public.questions
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Exercise attempts
CREATE POLICY "Students can view their own attempts" ON public.exercise_attempts
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own attempts" ON public.exercise_attempts
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own attempts" ON public.exercise_attempts
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can view all attempts" ON public.exercise_attempts
    FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Student answers
CREATE POLICY "Students can view their own answers" ON public.student_answers
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own answers" ON public.student_answers
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can manage all answers" ON public.student_answers
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Student progress
CREATE POLICY "Students can view their own progress" ON public.student_progress
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can view all progress" ON public.student_progress
    FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "System can manage progress" ON public.student_progress
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Teacher applications
CREATE POLICY "Users can view their own applications" ON public.teacher_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications" ON public.teacher_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all applications" ON public.teacher_applications
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin activity log
CREATE POLICY "Admins can view activity log" ON public.admin_activity_log
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create activity log entries" ON public.admin_activity_log
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SEED DATA: Exercise categories
-- =============================================

INSERT INTO public.exercise_categories (name, name_nl, name_en, name_ar, description, icon, display_order) VALUES
('reading', 'Lezen', 'Reading', 'القراءة', 'Improve your Arabic reading skills', 'BookOpen', 1),
('writing', 'Schrijven', 'Writing', 'الكتابة', 'Practice writing in Arabic', 'PenTool', 2),
('listening', 'Luisteren', 'Listening', 'الاستماع', 'Develop your listening comprehension', 'Headphones', 3),
('speaking', 'Spreken', 'Speaking', 'التحدث', 'Practice your Arabic pronunciation', 'Mic', 4),
('grammar', 'Grammatica', 'Grammar', 'القواعد', 'Master Arabic grammar rules', 'BookText', 5);