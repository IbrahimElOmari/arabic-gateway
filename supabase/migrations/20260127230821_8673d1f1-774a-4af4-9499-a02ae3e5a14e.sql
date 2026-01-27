-- =============================================
-- PUNT 1: Update handle_new_user trigger voor extra profielvelden
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name,
        phone,
        address,
        date_of_birth,
        study_level
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'address',
        CASE 
            WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
                AND NEW.raw_user_meta_data->>'date_of_birth' != ''
            THEN (NEW.raw_user_meta_data->>'date_of_birth')::date 
            ELSE NULL 
        END,
        NEW.raw_user_meta_data->>'study_level'
    );
    
    -- Default role is student
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$;

-- =============================================
-- PUNT 2: Events tabel voor Kalendermodule
-- =============================================

-- Events table for calendar functionality
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL,
    
    -- Target specification (who sees this event)
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'level', 'class', 'user')),
    target_id UUID,
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false NOT NULL,
    
    -- Recurrence (optional)
    recurrence_rule TEXT,
    recurrence_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Event type/category
    event_type TEXT DEFAULT 'general' NOT NULL CHECK (event_type IN ('general', 'lesson', 'exam', 'deadline', 'webinar', 'personal')),
    
    -- Color coding
    color TEXT DEFAULT '#3d8c6e',
    
    -- Reminder settings
    reminder_minutes INTEGER[],
    
    -- Metadata
    location TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Constraint
    CONSTRAINT events_time_check CHECK (end_time > start_time)
);

-- Event attendees table
CREATE TABLE public.event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(event_id, user_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view their targeted events" ON public.events
    FOR SELECT USING (
        target_type = 'all'
        OR (target_type = 'level' AND target_id IN (
            SELECT c.level_id FROM public.classes c
            JOIN public.class_enrollments ce ON ce.class_id = c.id
            WHERE ce.student_id = auth.uid()
        ))
        OR (target_type = 'class' AND target_id IN (
            SELECT class_id FROM public.class_enrollments
            WHERE student_id = auth.uid()
        ))
        OR (target_type = 'user' AND (target_id = auth.uid() OR creator_id = auth.uid()))
        OR (target_type = 'class' AND target_id IN (
            SELECT id FROM public.classes WHERE teacher_id = auth.uid()
        ))
        OR public.has_role(auth.uid(), 'admin')
        OR (target_type = 'level' AND public.has_role(auth.uid(), 'teacher'))
    );

CREATE POLICY "Users can create personal events" ON public.events
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id
        AND (
            (target_type = 'user' AND target_id = auth.uid())
            OR (public.has_role(auth.uid(), 'teacher') AND target_type IN ('class', 'level'))
            OR public.has_role(auth.uid(), 'admin')
        )
    );

CREATE POLICY "Users can update their own events" ON public.events
    FOR UPDATE USING (
        auth.uid() = creator_id
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        auth.uid() = creator_id
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can delete their own events" ON public.events
    FOR DELETE USING (
        auth.uid() = creator_id
        OR public.has_role(auth.uid(), 'admin')
    );

-- Event attendees policies
CREATE POLICY "Users can view attendees for their events" ON public.event_attendees
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = event_attendees.event_id 
            AND e.creator_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can manage their own attendance" ON public.event_attendees
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Event creators can manage attendees" ON public.event_attendees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = event_attendees.event_id 
            AND e.creator_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = event_attendees.event_id 
            AND e.creator_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    );

-- =============================================
-- PUNT 3: Helper functie voor Stripe discount usage
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_discount_usage(p_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.discount_codes
    SET current_uses = current_uses + 1
    WHERE code = UPPER(p_code);
END;
$$;

-- =============================================
-- PUNT 4: Data Retention (GDPR) Tables and Functions
-- =============================================

-- Table to track data retention status
CREATE TABLE public.data_retention_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('marked_for_deletion', 'anonymized', 'deleted', 'retention_started')),
    retention_end_date TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for users pending deletion
CREATE TABLE public.users_pending_deletion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    unenrolled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deletion_scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.data_retention_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_pending_deletion ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage these tables
CREATE POLICY "Admins only data retention log" ON public.data_retention_log
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins only users pending deletion" ON public.users_pending_deletion
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_users_pending_deletion_updated_at
    BEFORE UPDATE ON public.users_pending_deletion
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: Mark user for deletion after unenrollment
CREATE OR REPLACE FUNCTION public.mark_user_for_deletion(
    p_user_id UUID,
    p_unenrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_deletion_date TIMESTAMP WITH TIME ZONE;
BEGIN
    v_deletion_date := p_unenrolled_at + INTERVAL '12 months';
    
    IF EXISTS (
        SELECT 1 FROM public.class_enrollments
        WHERE student_id = p_user_id
        AND status = 'enrolled'
    ) THEN
        RAISE EXCEPTION 'User still has active enrollments';
    END IF;
    
    INSERT INTO public.users_pending_deletion (
        user_id,
        unenrolled_at,
        deletion_scheduled_at,
        status
    )
    VALUES (
        p_user_id,
        p_unenrolled_at,
        v_deletion_date,
        'pending'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET unenrolled_at = p_unenrolled_at,
        deletion_scheduled_at = v_deletion_date,
        status = 'pending',
        updated_at = now();
    
    INSERT INTO public.data_retention_log (
        user_id,
        action,
        retention_end_date,
        details
    )
    VALUES (
        p_user_id,
        'marked_for_deletion',
        v_deletion_date,
        jsonb_build_object(
            'unenrolled_at', p_unenrolled_at,
            'scheduled_deletion', v_deletion_date
        )
    );
END;
$$;

-- Function: Cancel deletion (if user re-enrolls)
CREATE OR REPLACE FUNCTION public.cancel_user_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.users_pending_deletion
    SET status = 'cancelled',
        updated_at = now()
    WHERE user_id = p_user_id
    AND status = 'pending';
    
    INSERT INTO public.data_retention_log (
        user_id,
        action,
        details
    )
    VALUES (
        p_user_id,
        'retention_started',
        jsonb_build_object('reason', 'User re-enrolled')
    );
END;
$$;

-- Function: Anonymize user data
CREATE OR REPLACE FUNCTION public.anonymize_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_anonymous_id TEXT;
BEGIN
    v_anonymous_id := 'ANON_' || substr(md5(random()::text), 1, 12);
    
    UPDATE public.profiles
    SET 
        full_name = 'Geanonimiseerde Gebruiker',
        email = v_anonymous_id || '@deleted.local',
        phone = NULL,
        address = NULL,
        date_of_birth = NULL,
        avatar_url = NULL,
        study_level = NULL
    WHERE user_id = p_user_id;
    
    UPDATE public.forum_posts
    SET author_id = '00000000-0000-0000-0000-000000000000'
    WHERE author_id = p_user_id;
    
    UPDATE public.forum_comments
    SET author_id = '00000000-0000-0000-0000-000000000000'
    WHERE author_id = p_user_id;
    
    DELETE FROM public.chat_messages
    WHERE sender_id = p_user_id;
    
    DELETE FROM public.chat_reactions
    WHERE user_id = p_user_id;
    
    DELETE FROM public.events
    WHERE creator_id = p_user_id
    AND target_type = 'user';
    
    UPDATE public.student_answers
    SET student_id = '00000000-0000-0000-0000-000000000000'
    WHERE student_id = p_user_id;
    
    DELETE FROM public.student_progress
    WHERE student_id = p_user_id;
    
    UPDATE public.users_pending_deletion
    SET status = 'completed',
        updated_at = now()
    WHERE user_id = p_user_id;
    
    INSERT INTO public.data_retention_log (
        user_id,
        action,
        details
    )
    VALUES (
        p_user_id,
        'anonymized',
        jsonb_build_object('anonymized_at', now())
    );
END;
$$;

-- Function: Process due deletions (for cron)
CREATE OR REPLACE FUNCTION public.process_data_retention()
RETURNS TABLE(
    processed_count INTEGER,
    admin_notifications JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_record RECORD;
    v_processed INTEGER := 0;
    v_notifications JSONB := '[]'::JSONB;
BEGIN
    FOR v_user_record IN
        SELECT upd.user_id, upd.deletion_scheduled_at, p.email, p.full_name
        FROM public.users_pending_deletion upd
        LEFT JOIN public.profiles p ON p.user_id = upd.user_id
        WHERE upd.status = 'pending'
        AND upd.deletion_scheduled_at <= now()
    LOOP
        UPDATE public.users_pending_deletion
        SET status = 'processing'
        WHERE user_id = v_user_record.user_id;
        
        PERFORM public.anonymize_user_data(v_user_record.user_id);
        
        v_processed := v_processed + 1;
        
        v_notifications := v_notifications || jsonb_build_object(
            'user_id', v_user_record.user_id,
            'original_email', v_user_record.email,
            'original_name', v_user_record.full_name,
            'processed_at', now()
        );
    END LOOP;
    
    IF v_processed > 0 THEN
        INSERT INTO public.admin_activity_log (
            admin_id,
            action,
            target_table,
            details
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            'data_retention_processed',
            'users_pending_deletion',
            jsonb_build_object(
                'processed_count', v_processed,
                'users', v_notifications
            )
        );
    END IF;
    
    RETURN QUERY SELECT v_processed, v_notifications;
END;
$$;

-- Function: Get upcoming deletions (for admin dashboard)
CREATE OR REPLACE FUNCTION public.get_upcoming_deletions(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    unenrolled_at TIMESTAMP WITH TIME ZONE,
    deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
    days_until_deletion INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        upd.user_id,
        p.full_name,
        p.email,
        upd.unenrolled_at,
        upd.deletion_scheduled_at,
        EXTRACT(DAY FROM upd.deletion_scheduled_at - now())::INTEGER as days_until_deletion
    FROM public.users_pending_deletion upd
    JOIN public.profiles p ON p.user_id = upd.user_id
    WHERE upd.status = 'pending'
    AND upd.deletion_scheduled_at <= now() + (days_ahead || ' days')::INTERVAL
    ORDER BY upd.deletion_scheduled_at ASC;
$$;

-- Trigger: Auto-mark for deletion on unenrollment
CREATE OR REPLACE FUNCTION public.handle_unenrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF OLD.status = 'enrolled' AND NEW.status != 'enrolled' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.class_enrollments
            WHERE student_id = NEW.student_id
            AND status = 'enrolled'
            AND id != NEW.id
        ) THEN
            PERFORM public.mark_user_for_deletion(NEW.student_id, now());
        END IF;
    END IF;
    
    IF OLD.status != 'enrolled' AND NEW.status = 'enrolled' THEN
        PERFORM public.cancel_user_deletion(NEW.student_id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_enrollment_status_change
    AFTER UPDATE OF status ON public.class_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_unenrollment();