DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.can_access_curriculum(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) $$;
GRANT USAGE ON SCHEMA public, auth TO authenticated; GRANT SELECT ON public.curriculum_items TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(), public.has_role(uuid, public.app_role), public.can_access_curriculum(uuid) TO authenticated;
CREATE POLICY "Admins beheren items" ON public.curriculum_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Leerkrachten en admins zien alle items" ON public.curriculum_items FOR SELECT USING ((has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Leerkrachten maken items" ON public.curriculum_items FOR INSERT WITH CHECK ((has_role(auth.uid(), 'teacher'::app_role) AND (created_by = auth.uid())));
CREATE POLICY "Leerkrachten verwijderen eigen items" ON public.curriculum_items FOR DELETE USING ((has_role(auth.uid(), 'teacher'::app_role) AND (created_by = auth.uid())));
CREATE POLICY "Leerkrachten wijzigen items" ON public.curriculum_items FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role)) WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Toegang tot curriculum-items" ON public.curriculum_items FOR SELECT USING ((is_published AND can_access_curriculum(auth.uid())));
-- v1.1 (N1-W06): curriculum_unit_accessible zoals de signatuur live (2026-10-27, main 244de3e); in de replica = toegang voor elke bestaande gebruiker (de unit-toegang staat buiten RLS)
CREATE OR REPLACE FUNCTION public.curriculum_unit_accessible(_user_id uuid, _unit_code text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) $$;
GRANT EXECUTE ON FUNCTION public.curriculum_unit_accessible(uuid, text) TO authenticated;
-- v1.1: de tweede tabel met ON DELETE CASCADE naar curriculum_items (live: curriculum_item_media_item_id_fkey, confdeltype c)
CREATE TABLE public.curriculum_item_media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), item_id uuid REFERENCES public.curriculum_items(id) ON DELETE CASCADE);
