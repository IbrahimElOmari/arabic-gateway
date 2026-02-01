-- Knowledge Base / FAQ tables
CREATE TABLE IF NOT EXISTS public.faq_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name_nl TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'help-circle',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faq_articles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,
    title_nl TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    content_nl TEXT NOT NULL,
    content_en TEXT NOT NULL,
    content_ar TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    not_helpful_count INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Content reports table for moderation
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('forum_post', 'forum_comment', 'chat_message')),
    content_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin invitations table
CREATE TABLE IF NOT EXISTS public.admin_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'teacher')),
    invited_by UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- FAQ Categories policies
CREATE POLICY "Anyone can view active FAQ categories" ON public.faq_categories
    FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage FAQ categories" ON public.faq_categories
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- FAQ Articles policies
CREATE POLICY "Anyone can view published FAQ articles" ON public.faq_articles
    FOR SELECT USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage FAQ articles" ON public.faq_articles
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Content reports policies
CREATE POLICY "Users can create their own reports" ON public.content_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.content_reports
    FOR SELECT USING (auth.uid() = reporter_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins and teachers can update reports" ON public.content_reports
    FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Admin invitations policies
CREATE POLICY "Admins can manage invitations" ON public.admin_invitations
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_faq_categories_updated_at
    BEFORE UPDATE ON public.faq_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faq_articles_updated_at
    BEFORE UPDATE ON public.faq_articles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default FAQ categories
INSERT INTO public.faq_categories (name_nl, name_en, name_ar, icon, display_order) VALUES
    ('Aan de slag', 'Getting Started', 'البدء', 'rocket', 1),
    ('Account & Profiel', 'Account & Profile', 'الحساب والملف الشخصي', 'user', 2),
    ('Lessen & Planning', 'Lessons & Scheduling', 'الدروس والجدولة', 'calendar', 3),
    ('Oefeningen', 'Exercises', 'التمارين', 'book-open', 4),
    ('Betalingen', 'Payments', 'المدفوعات', 'credit-card', 5),
    ('Technische Ondersteuning', 'Technical Support', 'الدعم الفني', 'wrench', 6)
ON CONFLICT DO NOTHING;