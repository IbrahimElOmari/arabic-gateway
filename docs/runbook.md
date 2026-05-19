# Runbook — Huis van het Arabisch

## Incident-response

### Severity-niveaus

| Sev | Voorbeeld | Reactietijd |
|---|---|---|
| SEV-1 | App down, data-corruptie, auth-bypass | < 15 min |
| SEV-2 | Belangrijke feature kapot, betalingen falen | < 1 u |
| SEV-3 | Niet-blokkerende bug, kleine regressie | < 1 dag |

### Eerste 5 minuten

1. Verifieer impact op `/admin` (Cron Jobs page, Analytics).
2. Check Lovable Cloud status (`Connectors → Lovable Cloud`).
3. Check Edge Function logs op `Cloud → Functions → Logs`.
4. Communiceer in `#incidents` (placeholder — vul Slack/Teams in).

## Rollback

### Frontend
- Lovable: gebruik **History** in de Lovable editor → klik op vorige versie → **Restore**.
- Geen schade aan database.

### Database / Edge Functions
- **Migraties zijn forward-only.** Bij kapotte migratie:
  1. Schrijf revert-migratie via `supabase--migration`.
  2. Test op staging.
  3. Pas toe op productie.

## Secret-rotation

### Resend / Stripe / externe API keys
1. Genereer nieuwe key in provider-dashboard.
2. `Cloud → Secrets → Update`.
3. Edge functions worden automatisch herstart.
4. Verifieer met test-call.
5. Revoke oude key na 24u.

### Supabase service-role / anon key
- Roteer via `supabase--rotate_api_keys` tool. **Let op:** stuurt alle clients de logout in.

## Backup / Restore

### Verifieer PITR
- `Cloud → Backups → Point-in-Time Recovery`. Bewaartermijn = 7 dagen (Pro plan).

### Restore-drill (maandelijks)
1. Maak nieuw staging-project.
2. `supabase db dump --data-only > /tmp/backup.sql`.
3. `psql $STAGING_URL < /tmp/backup.sql`.
4. Verifieer rij-aantallen tabel `auth.users`, `enrollments`, `payments`.
5. Documenteer in `docs/restore-drills/YYYY-MM.md`.

### Storage-buckets
- TODO: configureer externe S3 sync (backup-target).

## Cron-jobs

- Status: `/admin/cron-jobs` (RPC `get_cron_job_status`).
- Bij failure: zie ook `public.cron_alerts` tabel.

## Deploy-flow

1. PR → CI groen → merge naar `main`.
2. Lovable deployt automatisch.
3. Edge function-wijzigingen: automatisch via `supabase--deploy_edge_functions`.
4. Smoke-test productie: log in als test-account, doe één lesson-flow.

## On-call rotatie

Placeholder — vul in zodra team bekend.
