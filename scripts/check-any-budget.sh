#!/bin/bash
# P3 hardening: cap the number of `any` annotations in src/.
# Lower BUDGET over time to reduce the footprint.
set -e
BUDGET=190
COUNT=$(grep -rn --include='*.ts' --include='*.tsx' -E ':\s*any\b|<any>|as any' src/ | wc -l | tr -d ' ')
echo "any-usage: $COUNT (budget: $BUDGET)"
if [ "$COUNT" -gt "$BUDGET" ]; then
  echo "::error::any-usage $COUNT exceeds budget $BUDGET. Replace with proper types or lower the budget intentionally."
  exit 1
fi
