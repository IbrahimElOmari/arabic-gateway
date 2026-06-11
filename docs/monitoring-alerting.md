# Monitoring & Alerting

Last updated: 2026-06-11

This project ships with three layered signals so degradation is detected and routed automatically:

| Layer | Source | Sink | Latency |
|-------|--------|------|---------|
| Client errors | `src/lib/error-monitor.ts` (`reportError`) + global handlers in `src/main.tsx` | Analytics edge function, optional Sentry DSN | < 1 s |
| Edge function health | `supabase/functions/monitor-health/index.ts` | `cron_alerts` table → admin in-app notifications, optional Sentry | < 1 min (cron) |
| Cron job failures | `pg_cron` jobs writing to `cron_alerts` | `cron-alert-dispatcher` → admin notifications, dead-letter after 3 attempts | < 1 min |

## Sentry (issue tracker)

Frontend wiring is already in place in `error-monitor.ts`. To enable forwarding:

1. Create a project in Sentry, copy its DSN.
2. Add it as `VITE_ERROR_MONITOR_DSN` to the workspace **build secrets** (so it's compiled into the client bundle).
3. Add it as runtime secret `SENTRY_DSN` so the `monitor-health` edge function can forward server-side failures.
4. (Optional) install the official SDK: `bun add @sentry/react` and swap the placeholder block in `error-monitor.ts` for `Sentry.captureException(err, { extra: context })`.

Without the DSN the code is a no-op — errors continue to land in the analytics edge function and `analytics_events` table.

## Health checks

The `monitor-health` edge function probes:

- `GET /functions/v1/health` (returns 200 + DB ping)
- `head` reads on `levels`, `profiles`, `user_roles`

Each probe has a latency SLO (default 1500 ms, overridable via `HEALTH_SLO_MS`). Failures or slow responses insert a row into `cron_alerts`; the existing `cron-alert-dispatcher` fans them out as **in-app notifications to every admin**. When `SENTRY_DSN` is set the same failure is also forwarded to Sentry's `store/` endpoint.

### Scheduling

Run every minute via `pg_cron` (insert via the Supabase SQL editor — anon key + URL are project-specific so they are intentionally not committed):

```sql
select cron.schedule(
  'monitor-health-1m',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/monitor-health',
    headers := '{"Content-Type":"application/json","apikey":"<anon-key>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

## Routing rules

| Severity | Channel | Owner |
|----------|---------|-------|
| `cron_alerts` row | In-app notification + Sentry | On-call admin |
| 3× failed dispatch | `cron_dead_letter` table | Manual triage |
| Client error burst (> 5/min from one session) | Throttled in `error-logger.ts` | Sentry issue |
| Health probe red for 3 consecutive minutes | Page on-call (rule configured in Sentry → Alerts) | On-call |

## Verifying the pipeline

```bash
# manually trigger a probe
curl -X POST https://<project-ref>.supabase.co/functions/v1/monitor-health \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# inject a synthetic failure
psql $DATABASE_URL -c "insert into cron_alerts(jobid,jobname,status,started_at,ended_at,return_message)
  values (0,'synthetic-test','failed',now(),now(),'manual smoke test');"
# expect: every admin receives an in-app notification within 60 s
```
