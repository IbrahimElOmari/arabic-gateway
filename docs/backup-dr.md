# Backup & Disaster Recovery

## Objectives

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | ≤ 5 minutes (Supabase PITR) / ≤ 24 h (logical) |
| **RTO** (Recovery Time Objective) | ≤ 1 hour per environment |
| **Retention** | 30 daily • 12 weekly • 12 monthly |

## Layers

### 1. Platform PITR (primary)
Lovable Cloud / Supabase keeps automated point-in-time recovery for **7 days**. This is our first line of defence and provides 5-minute RPO.

### 2. Logical dumps (secondary, offsite)
`scripts/backup-db.sh` produces gzipped `pg_dump` artifacts. Run from CI on a daily schedule, push to encrypted object storage outside the Supabase project (e.g. AWS S3 with versioning + Object Lock).

```bash
DATABASE_URL="$SUPABASE_DB_URL" ./scripts/backup-db.sh ./backups
aws s3 cp ./backups/ s3://hva-backups/$(date -u +%Y/%m/%d)/ --recursive --sse AES256
```

### 3. Storage buckets
Supabase Storage is mirrored nightly with `aws s3 sync` of each bucket (excluding the public `exercise-media` bucket which is already source-controlled or regeneratable).

## Restore procedures

### Full DR drill (staging)
```bash
# 1. Provision a fresh staging project
# 2. Set TARGET_URL to its db URL
TARGET_URL="$STAGING_DB_URL" ./scripts/restore-db.sh ./backups/db-YYYYMMDD-HHMMSS.sql.gz
# 3. Re-apply env secrets (Turnstile, Stripe test keys, etc.)
# 4. Smoke-test via `npm run test:e2e -- --grep="@critical"`
```

### Single-table recovery
1. Restore the dump into a throwaway database.
2. `pg_dump --table=public.<name> --data-only` from the throwaway.
3. `psql` the resulting file into production after manual review.

### PITR (preferred)
Use the Lovable Cloud dashboard → Database → Point-in-time recovery. Choose a timestamp ≤ 7 days ago. This is faster and lossless compared to logical restore.

## Quarterly DR exercise

Every quarter the team performs:

1. ✅ Restore the latest dump into a fresh project.
2. ✅ Run the critical-path e2e suite.
3. ✅ Verify auth, payments (test mode), file uploads.
4. ✅ Log timing in `docs/dr-exercises.md`.

A failed drill blocks the next release until the gap is closed.

## Monitoring

- Daily backup CI job posts success/failure to the admin notifications channel via `cron-alert-dispatcher`.
- Missing backup for > 26 h triggers a P1 alert.
- Checksums (`.sha256`) are verified during every restore.
