#!/bin/bash
# Detect hardcoded Tailwind color classes in src/ files.
# Usage: bash scripts/lint-colors.sh
# Exit code 0 = no matches (good), 1 = matches found (bad).

PATTERN='(bg|text|border|ring)-(red|green|blue|yellow|purple|amber|orange|pink|indigo|violet|cyan|teal|emerald|lime|sky|fuchsia|rose)-[0-9]'

MATCHES=$(grep -rn --include='*.tsx' --include='*.ts' -E "$PATTERN" src/ || true)

if [ -z "$MATCHES" ]; then
  echo "✅ No hardcoded color classes found."
  exit 0
else
  echo "❌ Hardcoded color classes detected:"
  echo "$MATCHES"
  exit 1
fi
