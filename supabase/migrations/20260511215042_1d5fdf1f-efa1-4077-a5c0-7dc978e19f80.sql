-- Enable pg_cron and pg_net extensions (idempotent)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
EXCEPTION WHEN others THEN NULL; END $$;

-- Remove any existing scheduler cron jobs to prevent duplicates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-app-scheduler') THEN
    PERFORM cron.unschedule('run-app-scheduler');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-lesson-reminders') THEN
    PERFORM cron.unschedule('run-lesson-reminders');
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- Schedule the scheduler edge function to run every day at 02:00 UTC
DO $$ BEGIN
  PERFORM cron.schedule(
    'run-app-scheduler',
    '0 2 * * *',
    $cron$
    SELECT
      net.http_post(
        url       := current_setting('app.supabase_url', true) || '/functions/v1/scheduler',
        headers   := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body      := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $cron$
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- Schedule lesson reminders at 01:30 UTC (before main scheduler)
DO $$ BEGIN
  PERFORM cron.schedule(
    'run-lesson-reminders',
    '30 1 * * *',
    $cron$
    SELECT
      net.http_post(
        url       := current_setting('app.supabase_url', true) || '/functions/v1/send-lesson-reminders',
        headers   := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body      := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $cron$
  );
EXCEPTION WHEN others THEN NULL; END $$;