
DROP FUNCTION IF EXISTS public.acknowledge_cron_alert(uuid);

CREATE OR REPLACE FUNCTION public.acknowledge_cron_alert(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.cron_alerts
    SET acknowledged_at = now(),
        acknowledged_by = auth.uid()
    WHERE id = p_alert_id;
END;
$$;
