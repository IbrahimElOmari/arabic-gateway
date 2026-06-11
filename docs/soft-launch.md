# Soft-launch Checklist

Bewijs dat elke fase (P1–P7) productie-gereed is afgerond volgens de strenge definitie uit `.lovable/plan.md`.

## T-7 dagen — Pre-flight

### Code & build
- [x] `npx tsc --noEmit` — 0 errors (strict roadmap fase 1-2 actief)
- [x] `npm run lint` — 0 errors, `any`-budget bewaakt door `scripts/check-any-budget.sh`
- [x] `npm run check:i18n` — pariteit nl/en/ar
- [x] `npm run test` — unit + integratie groen, coverage ≥ 80% lines / 75% branches
- [x] `npx playwright test` — e2e suite groen (auth, payments, rtl, a11y)
- [x] `npm audit --audit-level=high` — 0 high/critical
- [x] Lighthouse CI — Perf ≥ 85, A11y ≥ 95, Best Practices ≥ 95, SEO ≥ 95

### Security
- [x] Storage RLS policies per bucket geverifieerd (`docs/audit-report.md` §9)
- [x] `user_can_access_lesson` SQL-functie afdwingt enrolment-check
- [x] Magic-byte validatie actief in `upload-validation.ts`
- [x] Turnstile op Register / ForgotPassword / ApplyTeacher / Helpdesk
- [x] Server-side rate-limit op 7 kritieke edge functions
- [x] 2FA flow (`verify-2fa`) getest met geldige + ongeldige codes
- [x] Security scan zonder critical findings

### Data / Backup
- [x] PITR aan, retention 7 dagen (Pro plan)
- [x] `scripts/backup-db.sh` + `restore-db.sh` getest tegen staging
- [x] Restore-drill log onder `docs/restore-drills/` (laatste maand)
- [x] GDPR `delete-user-data` edge function purgeert storage + auth user

### Observability
- [x] Edge functions structured logging via `_shared/logger.ts`
- [x] `X-Request-Id` propagatie frontend → edge → DB
- [x] Cron failure → `cron_alerts` + `cron-alert-dispatcher`
- [x] Funnel-dashboard op `/admin/analytics`

### Documentatie
- [x] `README.md` met links naar runbook + architecture
- [x] `CONTRIBUTING.md` met setup, branch- en commit-conventies
- [x] `docs/runbook.md` (incident, rollback, secrets, restore)
- [x] `docs/api-contracts.md` (Zod schemas per edge function)
- [x] `docs/architecture.md` (Mermaid high-level diagram)
- [x] `docs/backup-dr.md`, `docs/db-tuning.md`, `docs/wcag-audit.md`, `docs/realtime-capacity.md`, `docs/staging-environment.md`
- [x] `docs/legal/processing-register.md` (GDPR Art. 30)
- [x] `docs/audit-report.md` per auditpunt afgevinkt met datum + commit-hash

## T-3 dagen — Staging soak

- [ ] Productie-shaped dump → staging via `scripts/restore-db.sh` (PII anonimiseren)
- [ ] Migraties dry-run: `supabase db diff --linked` = leeg
- [ ] 24u soak test op staging (geen errors in logs)
- [ ] Realtime loadtest `k6 run scripts/loadtest-realtime.js` — p95 < 500ms, 0% loss
- [ ] Manuele smoke: signup → enrollment → lesson → exercise → payment (test mode)
- [ ] RTL pass op alle hoofdroutes (`dir=rtl`, NVDA/VoiceOver)
- [ ] Feature flags productie-defaults gezet via `/admin/feature-flags`

## T-1 dag — Go/No-Go

- [ ] On-call rotatie bevestigd; #incidents channel actief
- [ ] Rollback-plan in release-PR beschreven
- [ ] Status page placeholder live
- [ ] Communicatie naar testgebruikers verstuurd
- [ ] Secrets in productie geverifieerd: `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`, `STRIPE_SECRET_KEY`, `LOVABLE_API_KEY`, `RESEND_API_KEY`
- [ ] DNS / custom domain TTL verlaagd (5 min) voor snelle rollback

## T-0 — Launch

- [ ] Merge `staging` → `main`, tag release `vX.Y.Z`
- [ ] Lovable publish via dialog
- [ ] Edge functions auto-deploy bevestigd
- [ ] Productie smoke-test (testaccount): login, lesson, payment-redirect
- [ ] Synthetic monitor `/health` endpoint groen
- [ ] Announcement live

## T+1 / T+7 — Post-launch

- [ ] Error-rate < 0.5% (logs review)
- [ ] p95 latency < 800ms op key API's
- [ ] Geen openstaande SEV-1 / SEV-2
- [ ] Retro in `docs/retros/YYYY-MM-DD-launch.md`
- [ ] Unlock #2 (e-mail infra) en #3 (Sentry) backlog

## Rollback-procedure

Zie `docs/runbook.md` § Rollback. Samengevat:

1. Frontend: Lovable History → vorige versie → Restore.
2. Edge functions: redeploy vorige commit via `supabase functions deploy`.
3. Database: forward-only revert-migratie via `supabase--migration`; nooit `DROP` zonder backup.
4. Communiceer status binnen 15 min in #incidents.
