-- Create placement status enum
CREATE TYPE placement_status AS ENUM ('pending', 'scheduled', 'completed', 'cancelled');

-- Create placement_tests table
CREATE TABLE public.placement_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ,
    meet_link TEXT,
    status placement_status NOT NULL DEFAULT 'pending',
    assigned_level_id UUID REFERENCES public.levels(id),
    assessed_by UUID,
    assessment_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.placement_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own placement tests"
    ON public.placement_tests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can manage placement tests"
    ON public.placement_tests FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_placement_tests_updated_at
    BEFORE UPDATE ON public.placement_tests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create placement test for new users
CREATE OR REPLACE FUNCTION public.create_placement_test_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.placement_tests (user_id, status)
    VALUES (NEW.id, 'pending');
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new registrations
CREATE TRIGGER on_new_user_create_placement
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_placement_test_for_new_user();