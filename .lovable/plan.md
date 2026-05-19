# Productie-gereedheidsplan — Volledige Afronding Audit (excl. Stripe, #2 en #3)

**Doel:** Alle openstaande blokkers, kritieke risico's en belangrijke verbeterpunten uit het auditrapport tot **100% voltooid** brengen volgens de strenge definitie van "voltooid" zoals eerder vastgelegd:

> **Voltooid = (a)** code geïmplementeerd, **(b)** RLS/security correct, **(c)** i18n-pariteit (nl/en/ar) zonder hardcoded strings, **(d)** unit + integratietest aanwezig en groen, **(e)** documentatie bijgewerkt, **(f)** CI groen (tsc, lint, i18n-lint, build, audit, e2e), **(g)** handmatig geverifieerd in preview, **(h)** geen `// @ts-ignore` of `any` toegevoegd zonder rationale.

**Uitgesteld (niet in scope nu):** #2 E-mail infrastructuur, #3 Error monitoring (Sentry/Datadog). Deze worden hervat zodra #1 (TypeScript strict) volledig is afgerond.

---

## Fasering & deadlines

```text
Week 1  →  #1 TypeScript strict (Fase 0–1: strictNullChecks)
Week 2  →  #1 vervolg (Fase 2: noImplicitAny)
Week 3  →  #4 Staging  +  #5 Server-side rate limiting  +  #7 Captcha
Week 4  →  #6 Backups/DR  +  #9 Storage RLS  +  #10 Realtime loadtest
Week 5  →  #8 GDPR/DPA  +  #13 WCAG 2.1 AA  +  RTL audit
Week 6  →  #11 Observability  +  #12 Performance  +  #15 Cron alerting
Week 7  →  #14 Test coverage drempel  +  #16 DB tuning  +  #17 Feature flags
Week 8  →  #1 Fase 3–4 (full strict)  +  #18 Documentatie  +  soft-launch checklist
```

---

## 1. TypeScript strict — volledige activatie

Volgens `docs/typescript-strict-roadmap.md` (al aanwezig).

**Stappen:**
- Fase 0: baseline `npx tsc --noEmit --strict 2>&1 | tee /tmp/strict-baseline.log`; errors per module tellen.
- Fase 1 (`strictNullChecks`): fix rij 1–2 (lib/supabase-api.ts, api-error.ts, integrations/supabase/*, AuthContext, ClassContext, use-admin-mutation). Doel: 0 errors met flag globaal aan.
- Fase 2 (`noImplicitAny`): rij 3–4 (lib/*, hooks/*). `any`-count van 189 → < 30.
- Fase 3: `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`. Rij 5–6.
- Fase 4: `strict: true` + `noUncheckedIndexedAccess` + `noImplicitOverride` + `noUnusedLocals/Parameters`. Rij 7–9. ESLint `@typescript-eslint/no-explicit-any: error`.

**Definitie voltooid:** `tsconfig.json` heeft `strict: true` + `noUncheckedIndexedAccess: true`. `npx tsc --noEmit` slaagt. `rg -n ": any\b|<any>|as any" src | wc -l` ≤ 5 (allen met `// @ts-explain` rationale). CI blokkeert PR's die het breken.

---

## 4. Staging-omgeving

**Stappen:**
- Tweede Supabase-project provisionen (`hva-staging`).
- Migration parity: script `scripts/sync-migrations.sh` dat alle `supabase/migrations/*.sql` toepast op staging.
- `.env.staging` met aparte URL/anon-key; Vite-mode `staging`.
- CI: deploy preview-branch → staging; smoke-test (Playwright) draait tegen staging.
- Seed-script `scripts/seed-staging.ts` voor reproduceerbare testdata.

**Voltooid:** Staging-URL bereikbaar; migraties identiek (`diff` van `pg_dump --schema-only` = leeg); CI deployt automatisch; runbook in `docs/staging.md`.

---

## 5. Server-side rate limiting (edge functions)

**Stappen:**
- Shared helper `supabase/functions/_shared/rate-limit.ts` met token-bucket op basis van Postgres-tabel `public.rate_limit_buckets` (user_id + endpoint + window).
- Per kritieke functie integreren: `send-email`, `helpdesk`, `ai-translate-i18n`, `stripe-checkout`, `manual-payment`, `analytics`, `verify-2fa`.
- Limieten: 10/min/user voor send-email, 60/min voor analytics, 5/min voor verify-2fa.
- Migratie: tabel + cleanup-cron (oude buckets > 1u verwijderen).
- Unit-test per functie + integratietest die 429 verifieert.

**Voltooid:** Alle 7 functies gebruiken helper; tests groen; logs tonen 429 bij overschrijding; runbook bijgewerkt.

---

## 6. Backups & disaster recovery

**Stappen:**
- PITR verifiëren in Supabase project settings; screenshot in `docs/dr-runbook.md`.
- Storage bucket export: cron-job die wekelijks `lesson-recordings` + `user-uploads` naar externe S3 sync't (rclone via edge function of GitHub Action).
- Restore-drill: script `scripts/restore-drill.sh` dat staging vanaf backup herstelt; maandelijks draaien.
- RPO/RTO afspraken: RPO=24u, RTO=4u; gedocumenteerd.

**Voltooid:** PITR aan; eerste restore-drill succesvol uitgevoerd en gelogd; runbook compleet.

---

## 7. Captcha op publieke formulieren

**Stappen:**
- Cloudflare Turnstile keys via `secrets--add_secret` (TURNSTILE_SITE_KEY publiek, TURNSTILE_SECRET_KEY backend).
- Component `<TurnstileWidget>` in `src/components/security/`.
- Integreren op: RegisterPage, ForgotPasswordPage, ApplyTeacherPage, HelpdeskPage (publiek tabblad).
- Edge function verifieert token via Turnstile siteverify-endpoint vóór business-logic.
- i18n keys voor foutmeldingen (nl/en/ar).

**Voltooid:** Alle 4 formulieren beschermd; integratietest faalt zonder geldige token; i18n compleet.

---

## 8. GDPR / AVG compliance

**Stappen:**
- DPA's: download van Supabase, Resend, Lovable, Stripe; opslaan in `docs/legal/dpa/`.
- Privacy policy review: `src/pages/PrivacyPage.tsx` updaten met alle subverwerkers + retention-periodes.
- Verwerkingsregister (Art. 30): `docs/legal/processing-register.md` met alle data-flows.
- Recht op vergetelheid: `export-user-data` edge function uitbreiden met `delete-user-data` (cascade via SQL + storage cleanup); UI in `/settings`.
- Cookie consent: review `CookieConsent.tsx` op categorieën (functioneel/analytisch/marketing).

**Voltooid:** Alle DPA's getekend; PrivacyPage juridisch reviewed; delete-flow E2E getest; verwerkingsregister compleet.

---

## 9. Storage RLS hardening

**Stappen:**
- Audit alle storage policies via `supabase--read_query` op `storage.objects`.
- Per bucket: verifieer dat alleen owner + admin/teacher (waar relevant) lezen/schrijven kan.
- Signed-URL TTL standaardiseren: max 1u voor `lesson-recordings`, 15min voor privé-bestanden.
- Server-side file validatie in `upload-validation.ts` uitbreiden: MIME-sniffing (magic bytes) ipv alleen extensie; max bestandsgrootte per bucket.
- Edge function `validate-upload` die pre-signed URL pas uitgeeft na validatie.

**Voltooid:** Storage policy-test `src/test/storage-policies.test.ts` dekt elke bucket × elke rol; signed-URL TTL geverifieerd; magic-byte validatie groen.

---

## 10. Realtime capaciteit & loadtest

**Stappen:**
- k6-script `scripts/loadtest-realtime.js`: 500 gelijktijdige WebSocket-clients op `messages` + `forum_posts` channels.
- Reconnect-strategie in `src/integrations/supabase/client.ts`: exponential backoff + jitter; max 5 retries.
- Metrieken: latency p95/p99, message-loss, reconnect-count.
- Documenteren in `docs/realtime-capacity.md`.

**Voltooid:** Loadtest met 500 clients haalt p95 < 500ms, 0% message-loss; reconnect bewezen na netwerk-drop.

---

## 11. Observability

**Stappen:**
- Structured logging in alle edge functions via bestaande `_shared/logger.ts` (al deels aanwezig — audit & uitbreiden).
- Request-tracing: `x-request-id` propageren van frontend → edge → DB (via `set_config`).
- Funnel-dashboard in `/admin/analytics`: signup → first-lesson → first-payment.
- Logs queryable via Supabase analytics tab; alert-regels gedocumenteerd.

**Voltooid:** Alle edge functions gebruiken logger; request-id zichtbaar in elke log; funnel-dashboard live.

---

## 12. Performance baseline

**Stappen:**
- Lighthouse CI al in pipeline — drempels instellen: Perf ≥ 85, A11y ≥ 95, Best Practices ≥ 95, SEO ≥ 95. Falen bij regressie.
- Image CDN: Supabase image transformation al aan; alle `<img>` migreren naar `?width=...&quality=...`.
- Bundle-budget: huidig 10MB → verlagen naar 5MB; per-route code-splitting verifiëren.
- Preload kritieke fonts; lazy-load alle admin-routes.

**Voltooid:** Lighthouse-drempels in CI; bundle < 5MB; alle pages Perf ≥ 85 op mobiel.

---

## 13. WCAG 2.1 AA + RTL audit

**Stappen:**
- axe-core via Playwright op elke route (`e2e/accessibility.spec.ts` uitbreiden).
- Manueel: keyboard-navigatie, screenreader (NVDA/VoiceOver) op kritieke flows.
- Kleurcontrast: `src/test/color-contrast.test.ts` uitbreiden naar alle semantische tokens.
- RTL: elke pagina inspecteren in `dir="rtl"` mode (Arabisch); fix `flex-row` → `flex-row rtl:flex-row-reverse` waar nodig.
- Focus-indicators uniform via `:focus-visible` token.

**Voltooid:** axe-core 0 violations op alle routes; RTL-screenshots per pagina in `docs/rtl-audit/`; WCAG-checklist 100% afgevinkt.

---

## 14. Test coverage drempel

**Stappen:**
- `vitest.config.ts`: `coverage.thresholds.lines = 80, branches = 75, functions = 80`.
- CI faalt onder drempel.
- `forum-likes-consistency.test.ts`: service-role-key als CI-secret toevoegen zodat test echt draait.
- Ontbrekende tests identificeren: `npx vitest --coverage` → gap-rapport → tests schrijven.

**Voltooid:** Coverage ≥ 80% lines globaal; geen `.skip()` in CI; rapport in artifact.

---

## 15. Cron failure alerting

**Stappen:**
- Migratie: trigger op `cron.job_run_details` die bij `status != 'succeeded'` een rij in `public.cron_alerts` schrijft.
- Edge function `cron-alert-dispatcher` (draait elke 5min): leest nieuwe alerts → stuurt naar admin via in-app notificatie + (later) e-mail.
- Retry-logica: failed jobs 3x retry met exponential backoff; daarna dead-letter in `cron_dead_letter`.
- CronJobsPage uitbreiden met "Alerts" tab.

**Voltooid:** Failure triggert binnen 5min een admin-notificatie; retry werkt; dead-letter zichtbaar in UI.

---

## 16. Database tuning

**Stappen:**
- Index audit: `supabase--read_query` op `pg_stat_user_indexes` → ongebruikte indexes verwijderen, ontbrekende toevoegen.
- `EXPLAIN ANALYZE` op top-10 queries (dashboard, leaderboards, analytics).
- pgBouncer aanzetten in `supabase/config.toml` (`[db.pooler] enabled = true`, pool_mode = "transaction").
- VACUUM/ANALYZE schedule via pg_cron (wekelijks).

**Voltooid:** Slow-query log < 100ms p95; pooler aan; index-rapport in `docs/db-tuning.md`.

---

## 17. Feature flags

**Stappen:**
- `feature-flags.ts` uitbreiden met DB-backed flags (`public.feature_flags` tabel; admin-UI om te togglen).
- Per-user / per-role / per-percentage rollout.
- Hook `useFeatureFlag(name)` met realtime subscribe.
- Admin-pagina `/admin/feature-flags`.

**Voltooid:** Flags toggle-baar zonder deploy; minstens 3 flags in gebruik (bv. `new-dashboard`, `beta-forum`, `gamification-v2`).

---

## 18. Documentatie

**Stappen:**
- `CONTRIBUTING.md`: dev-setup, branch-strategie, commit-conventie, PR-template.
- `docs/runbook.md`: incident-response, rollback, secret-rotation, restore-procedure.
- `docs/api-contracts.md`: alle edge functions met request/response schema (Zod).
- `docs/architecture.md`: high-level diagram (Mermaid).
- README.md uitbreiden met links.

**Voltooid:** Alle 5 docs aanwezig en review'd; nieuwe dev kan in < 1 dag bijdragen.

---

## Cross-cutting eisen (per item)

Voor élk item geldt voordat het als "voltooid" wordt gemarkeerd:
- ✅ Code + tests groen in CI
- ✅ i18n keys voor alle nieuwe UI-strings in nl/en/ar (`npm run check:i18n` groen)
- ✅ Semantische tokens (geen hardcoded kleuren)
- ✅ RLS-policy review als DB-tabel toegevoegd
- ✅ Geen nieuwe `any` zonder rationale
- ✅ Documentatie-snippet bijgewerkt
- ✅ Handmatige verificatie in preview gelogd in task-tracker

---

## Eindcriterium voor "100% audit voltooid"

- Alle items #1, #4–#18 hierboven gemarkeerd als voltooid volgens bovenstaande definitie.
- `npm run check:i18n` + `npx tsc --noEmit` + `npm run lint` + `npm run test:coverage` + `npx playwright test` + `npm audit --audit-level=high` + Lighthouse CI: **alle groen**.
- `docs/audit-report.md` bijgewerkt met "✅ Resolved" status per punt + datum + commit-hash.
- Soft-launch checklist (`docs/soft-launch.md`) volledig afgevinkt.
- Daarna #2 (e-mail) en #3 (Sentry) ontgrendelen en starten.

---

## Open beslissingen voor de gebruiker

1. Akkoord met 8-weken planning, of compactere/uitgebreidere tijdslijn?
2. Captcha-provider: Cloudflare Turnstile (gratis, aanbevolen) of hCaptcha?
3. Externe backup-target voor storage: AWS S3, Backblaze B2, of Cloudflare R2?
4. Loadtest-platform: lokaal k6 of gehost (Grafana Cloud k6)?
