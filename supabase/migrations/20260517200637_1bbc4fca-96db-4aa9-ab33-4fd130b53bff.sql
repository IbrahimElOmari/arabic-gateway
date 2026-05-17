
CREATE OR REPLACE FUNCTION public.get_cron_job_status()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  active boolean,
  last_run_started_at timestamptz,
  last_run_finished_at timestamptz,
  last_run_status text,
  last_run_duration_ms numeric,
  last_run_return_message text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.command::text,
    j.active,
    last_run.start_time,
    last_run.end_time,
    last_run.status::text,
    EXTRACT(EPOCH FROM (last_run.end_time - last_run.start_time)) * 1000 AS last_run_duration_ms,
    last_run.return_message::text
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT jrd.start_time, jrd.end_time, jrd.status, jrd.return_message
    FROM cron.job_run_details jrd
    WHERE jrd.jobid = j.jobid
    ORDER BY jrd.start_time DESC NULLS LAST
    LIMIT 1
  ) last_run ON true
  ORDER BY j.jobname;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_job_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_job_status() TO authenticated;

COMMENT ON FUNCTION public.get_cron_job_status() IS
  'Admin-only monitoring view of pg_cron jobs: schedule, active state, and the last run start/end/status/duration/message. Use to detect when scheduled jobs (analytics, reminders, scheduler, release-exercises) stop running.';
