#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Logical backup script for the Lovable Cloud Postgres database.
#
# Usage:
#   DATABASE_URL=postgres://... ./scripts/backup-db.sh [output-dir]
#
# Produces:
#   <out>/db-YYYYMMDD-HHMMSS.sql.gz         (schema + data, gzip)
#   <out>/db-YYYYMMDD-HHMMSS.schema.sql     (schema only, plain)
#   <out>/db-YYYYMMDD-HHMMSS.sha256         (checksums)
#
# Recommended cadence:
#   - Daily full dump kept for 30 days
#   - Weekly dump kept for 12 weeks
#   - Monthly dump kept for 12 months
#
# RPO: <= 24h (logical) / <= 5m (Supabase PITR)
# RTO: <= 1h restoring a single environment
# -----------------------------------------------------------------------------
set -euo pipefail

OUT_DIR="${1:-./backups}"
TS="$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

SCHEMAS=(public)
SCHEMA_ARGS=()
for s in "${SCHEMAS[@]}"; do SCHEMA_ARGS+=(--schema="$s"); done

FULL="$OUT_DIR/db-$TS.sql.gz"
SCHEMA="$OUT_DIR/db-$TS.schema.sql"
SUM="$OUT_DIR/db-$TS.sha256"

echo "→ Dumping schema-only to $SCHEMA"
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges "${SCHEMA_ARGS[@]}" > "$SCHEMA"

echo "→ Dumping full database to $FULL"
pg_dump "$DATABASE_URL" --no-owner --no-privileges --clean --if-exists "${SCHEMA_ARGS[@]}" \
  | gzip -9 > "$FULL"

echo "→ Writing checksums to $SUM"
( cd "$OUT_DIR" && sha256sum "db-$TS.sql.gz" "db-$TS.schema.sql" ) > "$SUM"

echo "✓ Backup complete: $FULL"
ls -lh "$FULL" "$SCHEMA" "$SUM"
