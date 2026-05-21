#!/usr/bin/env bash
# Runs the full a11y + RTL audit suite (axe-core, landmarks, keyboard, runtime
# switch, visual regression). Emits a markdown summary for GitHub PR checks.
set -euo pipefail

echo "▶ installing chromium…"
npx --yes playwright install --with-deps chromium >/dev/null

mkdir -p a11y-results

echo "▶ running a11y + RTL Playwright suite…"
set +e
npx playwright test \
  e2e/accessibility.spec.ts \
  e2e/rtl.spec.ts \
  e2e/rtl-runtime-switch.spec.ts \
  e2e/rtl-landmarks.spec.ts \
  e2e/rtl-keyboard.spec.ts \
  --project=chromium
STATUS=$?
set -e

echo "▶ building PR summary…"
node scripts/a11y-summary.mjs || true

exit $STATUS
