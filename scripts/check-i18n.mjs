#!/usr/bin/env node
/**
 * CI guard for i18n integrity:
 *  1. NL/EN/AR locale files MUST share the exact same key set (no missing/extra keys).
 *  2. No locale value may be empty.
 *  3. EN and AR locale values may NOT contain hard Dutch text (heuristic word list).
 *  4. Source files (src/**) may not contain hardcoded Dutch UI strings outside of
 *     the locale JSON files (heuristic; allowlist via // i18n-ignore comment).
 *
 * Exit code 0 = OK, 1 = violations found.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const LOCALES_DIR = join(ROOT, 'src', 'i18n', 'locales');
const SRC_DIR = join(ROOT, 'src');

const errors = [];

// ---------- 1. Load locales ----------
const locales = {};
for (const lng of ['nl', 'en', 'ar']) {
  const file = join(LOCALES_DIR, `${lng}.json`);
  locales[lng] = JSON.parse(readFileSync(file, 'utf8'));
}

const flatten = (obj, prefix = '') => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
};

const flat = {
  nl: flatten(locales.nl),
  en: flatten(locales.en),
  ar: flatten(locales.ar),
};

const nlKeys = new Set(Object.keys(flat.nl));

// ---------- 2. Key parity ----------
for (const lng of ['en', 'ar']) {
  const lngKeys = new Set(Object.keys(flat[lng]));
  for (const k of nlKeys) {
    if (!lngKeys.has(k)) errors.push(`[${lng}] missing key: ${k}`);
  }
  for (const k of lngKeys) {
    if (!nlKeys.has(k)) errors.push(`[${lng}] extra key (not in nl): ${k}`);
  }
}

// ---------- 3. Empty values ----------
for (const lng of ['nl', 'en', 'ar']) {
  for (const [k, v] of Object.entries(flat[lng])) {
    if (v === null || v === undefined || String(v).trim() === '') {
      errors.push(`[${lng}] empty value: ${k}`);
    }
  }
}

// ---------- 4. Dutch text in EN/AR locale values ----------
// Distinctive Dutch words that should never appear in English or Arabic strings.
const DUTCH_WORDS = [
  'inloggen', 'uitloggen', 'wachtwoord', 'gebruiker', 'gebruikers',
  'instellingen', 'beheer', 'leerling', 'docent', 'opslaan', 'verwijderen',
  'bewerken', 'toevoegen', 'oefening', 'oefeningen', 'lessen', 'opnames',
  'voortgang', 'aanmelden', 'registreren', 'volgende', 'vorige', 'annuleren',
  'bevestigen', 'verzenden', 'laden', 'fout', 'succes', 'mislukt', 'niveau',
  'klas', 'klassen', 'rooster', 'agenda', 'berichten', 'meldingen',
  'zoeken', 'filteren', 'sorteren', 'overzicht', 'rapporten', 'betalingen',
  'kortingscode', 'inschrijving', 'inschrijvingen', 'aanvraag', 'aanvragen',
  'goedkeuren', 'afwijzen', 'wachten', 'voltooid', 'mislukken',
];
const dutchRegex = new RegExp(`\\b(${DUTCH_WORDS.join('|')})\\b`, 'i');

for (const lng of ['en', 'ar']) {
  for (const [k, v] of Object.entries(flat[lng])) {
    if (typeof v !== 'string') continue;
    if (dutchRegex.test(v)) {
      const m = v.match(dutchRegex);
      errors.push(`[${lng}] suspected Dutch word "${m[0]}" in key ${k}: "${v}"`);
    }
  }
}

// ---------- 5. Hardcoded NL text in source ----------
// Scan .ts/.tsx for JSX text or string literals containing distinctive Dutch words.
// Files / lines containing `// i18n-ignore` are skipped.
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', 'i18n', 'test', '__snapshots__',
  'integrations', 'ui',
]);

const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      out.push(...walk(full));
    } else if (['.ts', '.tsx'].includes(extname(name))) {
      out.push(full);
    }
  }
  return out;
};

const sourceDutchRegex = new RegExp(`\\b(${DUTCH_WORDS.join('|')})\\b`);
const stringLitRegex = /(["'`])([^"'`\n]{3,200})\1/g;
const jsxTextRegex = />\s*([^<>{}\n]{3,200})\s*</g;

const sourceViolations = [];
for (const file of walk(SRC_DIR)) {
  const rel = relative(ROOT, file);
  // Skip locale files & test files & generated files
  if (rel.includes('/i18n/') || rel.includes('/test/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) continue;
  const content = readFileSync(file, 'utf8');
  if (content.includes('// i18n-ignore-file')) continue;

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('// i18n-ignore')) return;
    // Skip imports, console, comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import') || trimmed.startsWith('export type') || trimmed.startsWith('console.')) return;

    // Check string literals
    let m;
    stringLitRegex.lastIndex = 0;
    while ((m = stringLitRegex.exec(line)) !== null) {
      if (sourceDutchRegex.test(m[2])) {
        sourceViolations.push(`${rel}:${idx + 1}  "${m[2]}"`);
        break;
      }
    }
    // Check JSX text
    jsxTextRegex.lastIndex = 0;
    while ((m = jsxTextRegex.exec(line)) !== null) {
      if (sourceDutchRegex.test(m[1])) {
        sourceViolations.push(`${rel}:${idx + 1}  >${m[1].trim()}<`);
        break;
      }
    }
  });
}

if (sourceViolations.length) {
  for (const v of sourceViolations) errors.push(`[source] hardcoded NL: ${v}`);
}

// ---------- Report ----------
if (errors.length) {
  console.error('❌ i18n check failed with the following issues:\n');
  for (const e of errors.slice(0, 200)) console.error('  - ' + e);
  if (errors.length > 200) console.error(`  ... and ${errors.length - 200} more`);
  console.error(`\nTotal violations: ${errors.length}`);
  console.error('\nAdd `// i18n-ignore` on the line or `// i18n-ignore-file` at top of file to allowlist.');
  process.exit(1);
}

console.log('✅ i18n check passed.');
console.log(`   Locales: nl=${Object.keys(flat.nl).length}, en=${Object.keys(flat.en).length}, ar=${Object.keys(flat.ar).length}`);
