#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Restore a backup produced by backup-db.sh into a TARGET database.
#
# Usage:
#   TARGET_URL=postgres://... ./scripts/restore-db.sh ./backups/db-YYYYMMDD-HHMMSS.sql.gz
#
# WARNING: This drops and recreates objects in the target schema (--clean).
#          NEVER point TARGET_URL at production unless you fully understand it.
# -----------------------------------------------------------------------------
set -euo pipefail

FILE="${1:-}"
if [[ -z "${TARGET_URL:-}" || -z "$FILE" ]]; then
  echo "Usage: TARGET_URL=postgres://... $0 <backup.sql.gz>" >&2
  exit 1
fi

if [[ "$TARGET_URL" == *"prod"* || "$TARGET_URL" == *"production"* ]]; then
  read -rp "TARGET_URL looks like PRODUCTION. Type RESTORE to continue: " confirm
  [[ "$confirm" == "RESTORE" ]] || { echo "Aborted."; exit 1; }
fi

echo "→ Verifying checksum"
SUM_FILE="${FILE%.sql.gz}.sha256"
if [[ -f "$SUM_FILE" ]]; then
  ( cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$SUM_FILE")" )
fi

echo "→ Restoring $FILE into $TARGET_URL"
gunzip -c "$FILE" | psql "$TARGET_URL" -v ON_ERROR_STOP=1

echo "✓ Restore complete"
