-- ============================================================
-- #15 Cron failure alerting + #17 DB-backed feature flags
-- ============================================================

-- ---------- 1. cron_alerts ----------
CREATE TABLE IF NOT EXISTS public.cron_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jobid bigint NOT NULL,
  jobname text NOT NULL,
  runid bigint,
  status text NOT NULL,
  return_message text,
  started_at timestamptz,
  ended_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_alerts_unack ON public.cron_alerts (created_at DESC) WHERE acknowledged_at IS NULL;

ALTER TABLE public.cron_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read cron_alerts"
  ON public.cron_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update cron_alerts"
  ON public.cron_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function: write alert on failed cron run
CREATE OR REPLACE FUNCTION public.cron_alert_on_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_jobname text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'succeeded' AND NEW.status IS DISTINCT FROM 'running' THEN
    SELECT jobname INTO v_jobname FROM cron.job WHERE jobid = NEW.jobid;
    INSERT INTO public.cron_alerts (jobid, jobname, runid, status, return_message, started_at, ended_at)
    VALUES (NEW.jobid, COALESCE(v_jobname, 'unknown'), NEW.runid, NEW.status, NEW.return_message, NEW.start_time, NEW.end_time);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cron_alert_on_failure ON cron.job_run_details;
CREATE TRIGGER trg_cron_alert_on_failure
  AFTER INSERT OR UPDATE ON cron.job_run_details
  FOR EACH ROW EXECUTE FUNCTION public.cron_alert_on_failure();

-- Admin-only RPC: acknowledge an alert
CREATE OR REPLACE FUNCTION public.acknowledge_cron_alert(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.cron_alerts
     SET acknowledged_at = now(), acknowledged_by = auth.uid()
   WHERE id = p_alert_id;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_cron_alert(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.acknowledge_cron_alert(uuid) TO authenticated;

-- ---------- 2. feature_flags ----------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  rollout_percentage int NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  enabled_for_roles text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_feature_flag()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_feature_flag ON public.feature_flags;
CREATE TRIGGER trg_touch_feature_flag
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_feature_flag();

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read feature flags"
  ON public.feature_flags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage feature flags"
  ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;

-- Seed 3 initial flags
INSERT INTO public.feature_flags (key, description, enabled) VALUES
  ('new-dashboard',  'Experimentele nieuwe dashboard-layout', false),
  ('beta-forum',     'Beta-versie van het forum',             false),
  ('gamification-v2','Nieuwe XP/badge berekening',            false)
ON CONFLICT (key) DO NOTHING;