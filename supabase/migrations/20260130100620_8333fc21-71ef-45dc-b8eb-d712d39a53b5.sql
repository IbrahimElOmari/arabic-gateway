-- =====================================================
-- PRIORITEIT 3: COMPLETE DATABASE IMPLEMENTATIE
-- =====================================================

-- =====================================================
-- 1. TWO-FACTOR AUTHENTICATION (2FA) SYSTEEM
-- =====================================================

-- 2FA methode type
CREATE TYPE public.two_factor_method AS ENUM ('totp', 'sms', 'email');

-- 2FA configuratie tabel
CREATE TABLE public.user_two_factor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    method two_factor_method NOT NULL DEFAULT 'totp',
    totp_secret TEXT, -- Encrypted TOTP secret
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    backup_codes TEXT[], -- Encrypted backup codes
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2FA verificatie pogingen log
CREATE TABLE public.two_factor_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    method two_factor_method NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS voor 2FA tabellen
ALTER TABLE public.user_two_factor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own 2FA settings"
    ON public.user_two_factor FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own 2FA attempts"
    ON public.two_factor_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all 2FA settings"
    ON public.user_two_factor FOR SELECT
    USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all 2FA attempts"
    ON public.two_factor_attempts FOR SELECT
    USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2. GAMIFICATIE SYSTEEM
-- =====================================================

-- Badge types
CREATE TYPE public.badge_type AS ENUM (
    'first_exercise', 'first_lesson', 'streak_7', 'streak_30', 'streak_100',
    'perfect_score', 'speed_learner', 'night_owl', 'early_bird',
    'community_helper', 'level_complete', 'all_categories', 'dedication'
);

-- Badge rarity
CREATE TYPE public.badge_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

-- Badges definitie tabel
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_type badge_type NOT NULL UNIQUE,
    name_nl TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description_nl TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'award',
    rarity badge_rarity NOT NULL DEFAULT 'common',
    points_value INTEGER NOT NULL DEFAULT 10,
    requirement_value INTEGER, -- e.g., 7 for 7-day streak
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gebruiker badges
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_displayed BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(user_id, badge_id)
);

-- Punten systeem
CREATE TABLE public.user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    total_points INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    exercises_completed INTEGER NOT NULL DEFAULT 0,
    lessons_attended INTEGER NOT NULL DEFAULT 0,
    perfect_scores INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Punten transacties
CREATE TYPE public.points_action AS ENUM (
    'exercise_complete', 'exercise_perfect', 'lesson_attend', 
    'streak_bonus', 'badge_earned', 'forum_post', 'forum_help',
    'daily_login', 'level_complete'
);

CREATE TABLE public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action points_action NOT NULL,
    points INTEGER NOT NULL,
    reference_id UUID, -- Exercise ID, Lesson ID, etc.
    reference_type TEXT, -- 'exercise', 'lesson', 'badge', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leaderboards (weekly/monthly/all-time)
CREATE TYPE public.leaderboard_period AS ENUM ('weekly', 'monthly', 'all_time');

CREATE TABLE public.leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    period leaderboard_period NOT NULL,
    period_start DATE NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    class_id UUID REFERENCES public.classes(id),
    level_id UUID REFERENCES public.levels(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, period, period_start, class_id),
    UNIQUE(user_id, period, period_start, level_id)
);

-- RLS voor gamificatie
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- Badges zijn publiek zichtbaar
CREATE POLICY "Anyone can view badges"
    ON public.badges FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage badges"
    ON public.badges FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- User badges zijn publiek zichtbaar (voor leaderboards/profiles)
CREATE POLICY "Anyone can view user badges"
    ON public.user_badges FOR SELECT
    USING (true);

CREATE POLICY "System can award badges"
    ON public.user_badges FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- User points zijn publiek zichtbaar
CREATE POLICY "Anyone can view user points"
    ON public.user_points FOR SELECT
    USING (true);

CREATE POLICY "System can update points"
    ON public.user_points FOR ALL
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher') OR auth.uid() = user_id)
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher') OR auth.uid() = user_id);

-- Points transactions
CREATE POLICY "Users can view their own transactions"
    ON public.points_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
    ON public.points_transactions FOR SELECT
    USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create transactions"
    ON public.points_transactions FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher') OR auth.uid() = user_id);

-- Leaderboards zijn publiek
CREATE POLICY "Anyone can view leaderboards"
    ON public.leaderboards FOR SELECT
    USING (true);

CREATE POLICY "System can update leaderboards"
    ON public.leaderboards FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. HELPDESK / SUPPORT TICKET SYSTEEM
-- =====================================================

-- Ticket status
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting_response', 'resolved', 'closed');

-- Ticket prioriteit
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Ticket categorie
CREATE TYPE public.ticket_category AS ENUM (
    'technical', 'billing', 'content', 'account', 'feedback', 'other'
);

-- Support tickets
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    category ticket_category NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID, -- Admin/teacher die het ticket behandelt
    resolved_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket responses
CREATE TABLE public.ticket_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false, -- Interne notities alleen voor staff
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket labels/tags
CREATE TABLE public.ticket_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3d8c6e',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction tabel voor ticket-labels
CREATE TABLE public.ticket_label_assignments (
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.ticket_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, label_id)
);

-- RLS voor helpdesk
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_label_assignments ENABLE ROW LEVEL SECURITY;

-- Users kunnen hun eigen tickets zien
CREATE POLICY "Users can view their own tickets"
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own open tickets"
    ON public.support_tickets FOR UPDATE
    USING (auth.uid() = user_id AND status = 'open');

CREATE POLICY "Staff can manage all tickets"
    ON public.support_tickets FOR ALL
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- Ticket responses
CREATE POLICY "Users can view responses on their tickets"
    ON public.ticket_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets t 
            WHERE t.id = ticket_responses.ticket_id 
            AND (t.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
        )
        AND (NOT is_internal OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
    );

CREATE POLICY "Users can create responses on their tickets"
    ON public.ticket_responses FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.support_tickets t 
            WHERE t.id = ticket_responses.ticket_id 
            AND (t.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
        )
    );

CREATE POLICY "Staff can manage all responses"
    ON public.ticket_responses FOR ALL
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- Labels
CREATE POLICY "Anyone can view labels"
    ON public.ticket_labels FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage labels"
    ON public.ticket_labels FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- Label assignments
CREATE POLICY "Staff can manage label assignments"
    ON public.ticket_label_assignments FOR ALL
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- =====================================================
-- 4. ANALYTICS SYSTEEM
-- =====================================================

-- Event types voor analytics
CREATE TYPE public.analytics_event_type AS ENUM (
    'page_view', 'exercise_start', 'exercise_complete', 'lesson_join', 'lesson_leave',
    'video_play', 'video_pause', 'video_complete', 'download', 'search',
    'login', 'logout', 'signup', 'error', 'feature_use'
);

-- Analytics events tabel
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id TEXT,
    event_type analytics_event_type NOT NULL,
    event_name TEXT NOT NULL,
    page_path TEXT,
    referrer TEXT,
    properties JSONB DEFAULT '{}',
    device_type TEXT, -- mobile, tablet, desktop
    browser TEXT,
    os TEXT,
    country TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dagelijkse geaggregeerde statistieken
CREATE TABLE public.analytics_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_date DATE NOT NULL,
    class_id UUID REFERENCES public.classes(id),
    level_id UUID REFERENCES public.levels(id),
    total_users INTEGER NOT NULL DEFAULT 0,
    active_users INTEGER NOT NULL DEFAULT 0,
    new_users INTEGER NOT NULL DEFAULT 0,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    avg_session_duration_seconds INTEGER NOT NULL DEFAULT 0,
    exercises_started INTEGER NOT NULL DEFAULT 0,
    exercises_completed INTEGER NOT NULL DEFAULT 0,
    lessons_attended INTEGER NOT NULL DEFAULT 0,
    page_views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(stat_date, class_id),
    UNIQUE(stat_date, level_id)
);

-- Learning analytics per student
CREATE TABLE public.student_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    week_start DATE NOT NULL,
    study_time_minutes INTEGER NOT NULL DEFAULT 0,
    exercises_attempted INTEGER NOT NULL DEFAULT 0,
    exercises_passed INTEGER NOT NULL DEFAULT 0,
    avg_score NUMERIC(5,2),
    strongest_category UUID REFERENCES public.exercise_categories(id),
    weakest_category UUID REFERENCES public.exercise_categories(id),
    lessons_attended INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_start)
);

-- Feature usage tracking
CREATE TABLE public.feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT NOT NULL,
    usage_date DATE NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(feature_name, usage_date)
);

-- RLS voor analytics
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Analytics events - alleen inserts door authenticated users
CREATE POLICY "Users can create their own events"
    ON public.analytics_events FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all events"
    ON public.analytics_events FOR SELECT
    USING (has_role(auth.uid(), 'admin'));

-- Daily stats - alleen admins
CREATE POLICY "Admins can manage daily stats"
    ON public.analytics_daily_stats FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- Student analytics
CREATE POLICY "Users can view their own analytics"
    ON public.student_analytics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all student analytics"
    ON public.student_analytics FOR SELECT
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "System can manage student analytics"
    ON public.student_analytics FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- Feature usage - alleen admins
CREATE POLICY "Admins can manage feature usage"
    ON public.feature_usage FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5. TRIGGERS EN FUNCTIONS
-- =====================================================

-- Trigger: Maak user_points record voor nieuwe users
CREATE OR REPLACE FUNCTION public.create_user_points_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_points (user_id, total_points, current_streak, longest_streak)
    VALUES (NEW.id, 0, 0, 0);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_user_create_points
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_points_for_new_user();

-- Functie: Genereer ticket nummer
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.support_tickets;
    new_number := 'HVA-' || LPAD(counter::TEXT, 6, '0');
    RETURN new_number;
END;
$$;

-- Trigger: Auto-genereer ticket nummer
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number_trigger
    BEFORE INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_ticket_number();

-- Functie: Award punten
CREATE OR REPLACE FUNCTION public.award_points(
    p_user_id UUID,
    p_action points_action,
    p_points INTEGER,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_total INTEGER;
BEGIN
    -- Insert transaction
    INSERT INTO public.points_transactions (user_id, action, points, reference_id, reference_type)
    VALUES (p_user_id, p_action, p_points, p_reference_id, p_reference_type);
    
    -- Update user points
    UPDATE public.user_points
    SET total_points = total_points + p_points,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING total_points INTO v_new_total;
    
    RETURN v_new_total;
END;
$$;

-- Functie: Update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_date DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    SELECT last_activity_date, current_streak, longest_streak
    INTO v_last_date, v_current_streak, v_longest_streak
    FROM public.user_points
    WHERE user_id = p_user_id;
    
    IF v_last_date IS NULL THEN
        -- Eerste activiteit
        v_current_streak := 1;
    ELSIF v_last_date = CURRENT_DATE THEN
        -- Al geregistreerd vandaag
        RETURN v_current_streak;
    ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Streak doorgezet
        v_current_streak := v_current_streak + 1;
    ELSE
        -- Streak onderbroken
        v_current_streak := 1;
    END IF;
    
    -- Update longest streak indien nodig
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;
    
    -- Update record
    UPDATE public.user_points
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_activity_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    RETURN v_current_streak;
END;
$$;

-- =====================================================
-- 6. SEED DATA: STANDAARD BADGES
-- =====================================================

INSERT INTO public.badges (badge_type, name_nl, name_en, name_ar, description_nl, description_en, description_ar, icon, rarity, points_value, requirement_value) VALUES
('first_exercise', 'Eerste Stap', 'First Step', 'الخطوة الأولى', 'Voltooi je eerste oefening', 'Complete your first exercise', 'أكمل أول تمرين لك', 'footprints', 'common', 10, 1),
('first_lesson', 'Leerling', 'Learner', 'المتعلم', 'Woon je eerste les bij', 'Attend your first lesson', 'احضر أول درس لك', 'graduation-cap', 'common', 10, 1),
('streak_7', 'Week Warrior', 'Week Warrior', 'محارب الأسبوع', '7 dagen op rij actief', 'Active 7 days in a row', 'نشط لمدة 7 أيام متتالية', 'flame', 'rare', 50, 7),
('streak_30', 'Maand Meester', 'Month Master', 'سيد الشهر', '30 dagen op rij actief', 'Active 30 days in a row', 'نشط لمدة 30 يومًا متتاليًا', 'fire', 'epic', 200, 30),
('streak_100', 'Legende', 'Legend', 'الأسطورة', '100 dagen op rij actief', 'Active 100 days in a row', 'نشط لمدة 100 يوم متتالي', 'crown', 'legendary', 1000, 100),
('perfect_score', 'Perfectionist', 'Perfectionist', 'الكمالي', 'Behaal 100% op een oefening', 'Get 100% on an exercise', 'احصل على 100% في تمرين', 'target', 'rare', 25, NULL),
('speed_learner', 'Snelle Leerling', 'Speed Learner', 'المتعلم السريع', 'Voltooi een oefening binnen de helft van de tijd', 'Complete an exercise in half the time', 'أكمل تمرينًا في نصف الوقت', 'zap', 'rare', 30, NULL),
('night_owl', 'Nachtuil', 'Night Owl', 'بومة الليل', 'Studeer na middernacht', 'Study after midnight', 'ادرس بعد منتصف الليل', 'moon', 'common', 15, NULL),
('early_bird', 'Vroege Vogel', 'Early Bird', 'الطائر المبكر', 'Studeer voor 7 uur ''s ochtends', 'Study before 7 AM', 'ادرس قبل الساعة 7 صباحًا', 'sunrise', 'common', 15, NULL),
('community_helper', 'Helper', 'Helper', 'المساعد', 'Help 10 medestudenten in het forum', 'Help 10 fellow students in the forum', 'ساعد 10 طلاب في المنتدى', 'heart-handshake', 'epic', 100, 10),
('level_complete', 'Niveau Meester', 'Level Master', 'سيد المستوى', 'Rond een volledig niveau af', 'Complete an entire level', 'أكمل مستوى كامل', 'trophy', 'epic', 500, NULL),
('all_categories', 'Allrounder', 'Allrounder', 'متعدد المواهب', 'Voltooi oefeningen in alle categorieën', 'Complete exercises in all categories', 'أكمل تمارين في جميع الفئات', 'star', 'rare', 75, 5),
('dedication', 'Toegewijd', 'Dedicated', 'المخلص', '50 oefeningen voltooid', 'Complete 50 exercises', 'أكمل 50 تمرين', 'medal', 'epic', 150, 50);

-- =====================================================
-- 7. STANDAARD TICKET LABELS
-- =====================================================

INSERT INTO public.ticket_labels (name, color, description) VALUES
('Bug', '#ef4444', 'Technische problemen en bugs'),
('Verbetering', '#3b82f6', 'Suggesties voor verbeteringen'),
('Vraag', '#22c55e', 'Algemene vragen'),
('Urgent', '#f97316', 'Dringende zaken'),
('Betaling', '#8b5cf6', 'Betalingsgerelateerde zaken'),
('Account', '#06b6d4', 'Accountproblemen');

-- =====================================================
-- 8. UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER update_user_two_factor_updated_at
    BEFORE UPDATE ON public.user_two_factor
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_points_updated_at
    BEFORE UPDATE ON public.user_points
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboards_updated_at
    BEFORE UPDATE ON public.leaderboards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();