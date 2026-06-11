# Turnstile staging e2e — run report

Last updated: 2026-06-11

## Scope

Spec: `e2e/turnstile.spec.ts` — 4 cases.

| # | Case | Layer |
|---|------|-------|
| 1 | Login page renders Turnstile iframe | UI |
| 2 | Register page renders Turnstile iframe | UI |
| 3 | `verify-captcha` returns 4xx + `success:false` on a forged token | Edge function |
| 4 | `verify-captcha` returns 429 within 50 rapid calls (rate limit) | Edge function |

Cases 3–4 auto-`test.skip` when `E2E_SUPABASE_URL` / `E2E_SUPABASE_ANON` are not provided, so the spec is safe to run anywhere.

## How to execute against staging

```bash
export E2E_BASE_URL="https://staging.<domain>"
export E2E_SUPABASE_URL="https://<staging-ref>.supabase.co"
export E2E_SUPABASE_ANON="<staging anon key>"
npx playwright test e2e/turnstile.spec.ts --reporter=list,html
```

Artifacts (screenshots on failure, trace, HTML report) land in `playwright-report/` — that's the directory to attach to any follow-up issue.

## Run on 2026-06-11

Status: **not yet executed in CI**. Reason: the staging Lovable Cloud project, its anon key, and the `VITE_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` secrets must first be configured per `docs/staging-environment.md`. Once those are in the GitHub Actions secret bundle, the existing `.github/workflows/ci.yml` job will pick up `e2e/turnstile.spec.ts` automatically because it lives under `e2e/`.

### Pre-flight that *was* runnable locally

- ✅ Spec compiles under Playwright 1.x typings
- ✅ `TurnstileWidget` no-ops when `VITE_TURNSTILE_SITE_KEY` is unset (preview env) — confirmed in `src/components/security/TurnstileWidget.tsx:33`
- ✅ `verify-captcha` enforces 30 rps / IP via `_shared/rate-limit.ts` — confirmed by code review of `supabase/functions/verify-captcha/index.ts:33-39`
- ✅ Invalid-body short-circuit returns 400 — `verify-captcha/index.ts:48-52`

### Action items to actually run end-to-end

1. Provision the staging cloud project (see `docs/staging-environment.md` § Bootstrap).
2. Set the two Turnstile secrets there (`TURNSTILE_SECRET_KEY` = `1x0000000000000000000000000000000AA`, `VITE_TURNSTILE_SITE_KEY` = `1x00000000000000000000AA`).
3. Set the same three `E2E_*` env vars in the GitHub Actions `staging` environment.
4. Re-run this report; paste the Playwright HTML report URL into the table above.
