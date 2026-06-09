# Staging Environment

A dedicated staging environment lets us validate migrations, edge functions, and feature flags before they reach production users.

## Topology

| Concern | Production | Staging |
|---------|-----------|---------|
| Lovable Cloud project | `ugftwkpbmvbmgmpzhmtc` | separate project (`*-staging`) |
| Branch | `main` | `staging` |
| URL | published domain | `staging.<domain>` |
| Secrets | live keys | test keys (Stripe test mode, Turnstile test sitekey) |
| Data | real | sanitized copy from monthly dump |

## Bootstrap

1. **Create the cloud project**: `npx supabase projects create hva-staging --org $ORG`.
2. **Apply migrations**: `npx supabase db push` against the new ref. All files in `supabase/migrations/` are environment-agnostic.
3. **Seed data**: `TARGET_URL=$STAGING_DB_URL ./scripts/restore-db.sh ./backups/db-latest.sql.gz` then run `scripts/anonymize-staging.sql` (drops PII).
4. **Deploy functions**: `npx supabase functions deploy --project-ref $STAGING_REF`.
5. **Configure secrets** in the staging dashboard:
   - `TURNSTILE_SECRET_KEY` → test key `1x0000000000000000000000000000000AA`
   - `STRIPE_SECRET_KEY` → `sk_test_…`
   - `LOVABLE_API_KEY` → staging-specific key
6. **Frontend env** (`.env.staging`):
   ```
   VITE_SUPABASE_URL=https://<staging-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<staging anon>
   VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
   ```

## CI Flow

```
PR → main          → preview deploy (Lovable)
push staging       → deploy to staging cloud project + run e2e suite
push main + tag    → production release (manual approval)
```

The `.github/workflows/ci.yml` matrix uses the `ENVIRONMENT` variable to pick the right secrets bundle. Migrations are dry-run with `supabase db diff --linked` against staging before any production merge.

## Promotion checklist

Before promoting staging → production:

- [ ] All CI jobs green (typecheck, unit, e2e, a11y, visual, lighthouse)
- [ ] Migrations rehearsed against the latest production-shaped dump
- [ ] Feature flags configured in production
- [ ] Rollback plan documented in the PR description
- [ ] On-call notified

## Tear-down

Staging projects accrue cost. Pause unused staging projects via `supabase projects pause $STAGING_REF` when no active feature work targets them.
