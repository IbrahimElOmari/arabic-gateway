#!/usr/bin/env bash
# WCAG 2.1 AA + RTL audit. Runs axe-core via Playwright over key public routes
# in both LTR (default) and RTL (Arabic) modes.
#
# Usage: bash scripts/a11y-audit.sh
# Exit code 0 = pass, non-zero = violations found.
set -euo pipefail

echo "▶ Running WCAG/RTL audit (Playwright + axe-core)"
npx playwright install --with-deps chromium >/dev/null 2>&1 || true

# Accessibility (LTR) + RTL specs only — fast, no auth required.
npx playwright test --project=chromium \
  e2e/accessibility.spec.ts \
  e2e/rtl.spec.ts \
  --reporter=list

echo "✅ A11y/RTL audit passed"
