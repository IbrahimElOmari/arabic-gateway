#!/usr/bin/env node
/**
 * CI guard for i18n integrity.
 *
 * Checks:
 *  1. NL/EN/AR locale files MUST share the exact same key set.
 *  2. No locale value may be empty.
 *  3. EN/AR locale string values may not contain distinctive Dutch words.
 *  4. Source files (src/**) may not contain hardcoded Dutch UI text
 *     (heuristic — see {@link looksLikeDutchUserFacing}).
 *
 * Usage:
 *   node scripts/check-i18n.mjs            # run checks, exit 1 on violations
 *   node scripts/check-i18n.mjs --fix      # add missing keys to en/ar from nl
 *   node scripts/check-i18n.mjs --fix --placeholder "TODO"
 *
 * Allowlist:
 *   `// i18n-ignore` on a line  -> skip that line
 *   `// i18n-ignore-file` in a file -> skip the entire file
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- Constants ----------

/** Distinctive Dutch words that should not appear in EN/AR strings or source UI. */
export const DUTCH_WORDS = [
  'inloggen', 'uitloggen', 'wachtwoord', 'gebruiker', 'gebruikers',
  'instellingen', 'beheer', 'leerling', 'docent', 'opslaan', 'verwijderen',
  'bewerken', 'toevoegen', 'oefening', 'oefeningen', 'lessen', 'opnames',
  'voortgang', 'aanmelden', 'registreren', 'volgende', 'vorige', 'annuleren',
  'bevestigen', 'verzenden', 'laden', 'mislukt', 'niveau',
  'klas', 'klassen', 'rooster', 'agenda', 'berichten', 'meldingen',
  'zoeken', 'filteren', 'sorteren', 'overzicht', 'rapporten', 'betalingen',
  'kortingscode', 'inschrijving', 'inschrijvingen', 'aanvraag', 'aanvragen',
  'goedkeuren', 'afwijzen', 'wachten', 'voltooid', 'mislukken',
];

const dutchWordRegex = new RegExp(`\\b(${DUTCH_WORDS.join('|')})\\b`, 'i');

/**
 * Words that look Dutch but commonly appear as identifiers/code, so we require
 * a stronger signal (a second Dutch word, or a space) before flagging.
 */
const COMMON_AMBIGUOUS = new Set([
  'fout', 'succes', 'laden', 'niveau', 'agenda', 'klas', 'docent',
]);

// ---------- Helpers ----------

export function flatten(obj, prefix = '') {
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
}

/** Reverse of flatten: build a nested object from dotted keys. */
export function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (typeof cur[p] !== 'object' || cur[p] === null || Array.isArray(cur[p])) {
        cur[p] = {};
      }
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return out;
}

/**
 * Heuristic: does this string look like user-facing Dutch text?
 *
 * Rules to reduce false positives:
 *  - Must contain a letter and a space OR end in punctuation OR contain ≥2 Dutch words.
 *  - Pure identifiers (snake_case, camelCase, kebab-case, dotted) are skipped.
 *  - Strings with only an "ambiguous" word (e.g. "fout", "niveau") need extra signal.
 *  - URLs, file paths, hex/uuid-like strings are skipped.
 */
export function looksLikeDutchUserFacing(s) {
  if (typeof s !== 'string') return null;
  const text = s.trim();
  if (text.length < 4) return null;

  // Skip URLs, paths, identifiers, css classes, data-uris.
  if (/^(https?:|mailto:|data:|\/|\.\/|\.\.\/)/i.test(text)) return null;
  if (/^[a-z0-9_]+$/i.test(text)) return null;                   // single identifier
  if (/^[a-z][a-zA-Z0-9]*$/.test(text) && !text.includes(' ')) return null; // camelCase
  if (/^[a-z0-9-]+$/.test(text) && text.includes('-')) return null;        // kebab-case
  if (/^[a-z0-9_.]+$/i.test(text) && text.includes('.')) return null;      // dotted key
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return null;                          // hex color
  if (/^[0-9a-f-]{16,}$/i.test(text)) return null;                          // uuid-ish

  const matches = text.match(new RegExp(`\\b(${DUTCH_WORDS.join('|')})\\b`, 'gi'));
  if (!matches || matches.length === 0) return null;

  const hasSpace = /\s/.test(text);
  const endsWithPunct = /[.!?…]$/.test(text);
  const lower = matches.map((m) => m.toLowerCase());
  const onlyAmbiguous = lower.every((w) => COMMON_AMBIGUOUS.has(w));

  // Need at least one strong signal:
  //  - multi-word sentence-like text, OR
  //  - 2+ Dutch words, OR
  //  - ends with punctuation
  // AND if the only match is ambiguous, require multi-word OR punctuation.
  if (onlyAmbiguous && !(hasSpace || endsWithPunct)) return null;
  if (!hasSpace && !endsWithPunct && matches.length < 2) return null;

  return matches[0];
}

// ---------- Locale checks ----------

export function checkLocaleParity(locales) {
  const errors = [];
  const flat = {
    nl: flatten(locales.nl),
    en: flatten(locales.en),
    ar: flatten(locales.ar),
  };
  const nlKeys = new Set(Object.keys(flat.nl));
  for (const lng of ['en', 'ar']) {
    const lngKeys = new Set(Object.keys(flat[lng]));
    for (const k of nlKeys) if (!lngKeys.has(k)) errors.push(`[${lng}] missing key: ${k}`);
    for (const k of lngKeys) if (!nlKeys.has(k)) errors.push(`[${lng}] extra key (not in nl): ${k}`);
  }
  return errors;
}

export function checkEmptyValues(locales) {
  const errors = [];
  for (const lng of ['nl', 'en', 'ar']) {
    for (const [k, v] of Object.entries(flatten(locales[lng]))) {
      if (v === null || v === undefined || String(v).trim() === '') {
        errors.push(`[${lng}] empty value: ${k}`);
      }
    }
  }
  return errors;
}

export function checkDutchInTranslations(locales) {
  const errors = [];
  for (const lng of ['en', 'ar']) {
    for (const [k, v] of Object.entries(flatten(locales[lng]))) {
      if (typeof v !== 'string') continue;
      const m = v.match(dutchWordRegex);
      if (m) errors.push(`[${lng}] suspected Dutch word "${m[0]}" in key ${k}: "${v}"`);
    }
  }
  return errors;
}

// ---------- Source scan ----------

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', 'i18n', 'test', '__snapshots__',
  'integrations', 'ui',
]);

function walk(dir) {
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
}

const stringLitRegex = /(["'`])((?:\\.|(?!\1)[^\\\n])+?)\1/g;
const jsxTextRegex = />([^<>{}\n]{4,200})</g;

/** Lines that should never be scanned for hardcoded Dutch. */
function isSkippableLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return true;
  if (t.startsWith('import') || t.startsWith('export ') || t.startsWith('from ')) return true;
  if (t.startsWith('console.') || t.startsWith('logger.') || t.startsWith('log.')) return true;
  if (t.startsWith('throw new ')) return true;
  if (/^(type|interface|enum)\s/.test(t)) return true;
  return false;
}

/** Attribute names whose string values are NOT user-facing. */
const NON_UI_ATTRS = new Set([
  'className', 'class', 'id', 'key', 'href', 'to', 'src', 'name', 'type',
  'data-testid', 'role', 'rel', 'target', 'autoComplete', 'inputMode',
  'aria-controls', 'aria-labelledby', 'aria-describedby', 'form',
]);

function isInsideNonUiAttr(line, matchStart) {
  // Look backwards for an attribute name = right before the string.
  const pre = line.slice(0, matchStart);
  const m = pre.match(/([A-Za-z-]+)\s*=\s*\{?\s*$/);
  if (!m) return false;
  return NON_UI_ATTRS.has(m[1]);
}

export function scanSourceForDutch(files, readFile = (f) => readFileSync(f, 'utf8')) {
  const violations = [];
  for (const file of files) {
    const content = readFile(file);
    if (content.includes('// i18n-ignore-file')) continue;
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('// i18n-ignore')) return;
      if (isSkippableLine(line)) return;

      // String literals
      let m;
      stringLitRegex.lastIndex = 0;
      while ((m = stringLitRegex.exec(line)) !== null) {
        const text = m[2];
        if (isInsideNonUiAttr(line, m.index)) continue;
        const hit = looksLikeDutchUserFacing(text);
        if (hit) {
          violations.push({ file, line: idx + 1, text, hit });
          break;
        }
      }
      // JSX text (between > and <)
      jsxTextRegex.lastIndex = 0;
      while ((m = jsxTextRegex.exec(line)) !== null) {
        const text = m[1].trim();
        const hit = looksLikeDutchUserFacing(text);
        if (hit) {
          violations.push({ file, line: idx + 1, text, hit });
          break;
        }
      }
    });
  }
  return violations;
}

// ---------- Auto-fix ----------

/**
 * Add missing keys to `target` based on `source`, using `placeholder(value, key)`
 * to compute the new value.  Returns { added, result } where `added` is the list
 * of keys that were inserted.
 */
export function autoFixMissingKeys(sourceFlat, targetFlat, placeholder) {
  const added = [];
  const result = { ...targetFlat };
  for (const [k, v] of Object.entries(sourceFlat)) {
    if (!(k in result)) {
      result[k] = placeholder(v, k);
      added.push(k);
    }
  }
  return { added, result };
}

// ---------- CLI ----------

function parseArgs(argv) {
  const args = { fix: false, placeholder: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fix') args.fix = true;
    else if (a === '--placeholder') args.placeholder = argv[++i] ?? '';
    else if (a.startsWith('--placeholder=')) args.placeholder = a.slice('--placeholder='.length);
  }
  return args;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const ROOT = join(__filename, '..', '..');
  const LOCALES_DIR = join(ROOT, 'src', 'i18n', 'locales');
  const SRC_DIR = join(ROOT, 'src');
  const args = parseArgs(process.argv.slice(2));

  const locales = {};
  for (const lng of ['nl', 'en', 'ar']) {
    locales[lng] = JSON.parse(readFileSync(join(LOCALES_DIR, `${lng}.json`), 'utf8'));
  }

  // Auto-fix mode: add missing keys then exit 0.
  if (args.fix) {
    const nlFlat = flatten(locales.nl);
    let totalAdded = 0;
    for (const lng of ['en', 'ar']) {
      const lngFlat = flatten(locales[lng]);
      const tag = lng.toUpperCase();
      const placeholderFn = (v) => {
        if (args.placeholder !== null) return args.placeholder;
        return typeof v === 'string' ? `[${tag}] ${v}` : v;
      };
      const { added, result } = autoFixMissingKeys(nlFlat, lngFlat, placeholderFn);
      if (added.length) {
        const nested = unflatten(result);
        writeFileSync(join(LOCALES_DIR, `${lng}.json`), JSON.stringify(nested, null, 2) + '\n');
        console.log(`✏️  ${lng}: added ${added.length} key(s)`);
        for (const k of added.slice(0, 20)) console.log(`     + ${k}`);
        if (added.length > 20) console.log(`     ... and ${added.length - 20} more`);
        totalAdded += added.length;
      }
    }
    console.log(totalAdded === 0 ? '✅ No missing keys.' : `✅ Auto-fix complete. Added ${totalAdded} key(s) total.`);
    process.exit(0);
  }

  const errors = [
    ...checkLocaleParity(locales),
    ...checkEmptyValues(locales),
    ...checkDutchInTranslations(locales),
  ];

  const sourceFiles = walk(SRC_DIR).filter((f) => {
    const rel = relative(ROOT, f);
    return !rel.includes('/i18n/') && !rel.includes('/test/')
      && !rel.endsWith('.test.ts') && !rel.endsWith('.test.tsx');
  });
  const sourceViolations = scanSourceForDutch(sourceFiles);
  for (const v of sourceViolations) {
    errors.push(`[source] hardcoded NL: ${relative(ROOT, v.file)}:${v.line}  "${v.text}" (${v.hit})`);
  }

  if (errors.length) {
    console.error('❌ i18n check failed:\n');
    for (const e of errors.slice(0, 200)) console.error('  - ' + e);
    if (errors.length > 200) console.error(`  ... and ${errors.length - 200} more`);
    console.error(`\nTotal violations: ${errors.length}`);
    console.error('\nTip: run `npm run fix:i18n` to auto-add missing keys.');
    console.error('Tip: add `// i18n-ignore` on a line or `// i18n-ignore-file` at top to allowlist.');
    process.exit(1);
  }

  const flatNl = flatten(locales.nl);
  console.log('✅ i18n check passed.');
  console.log(`   Locales: nl=${Object.keys(flatNl).length}, en=${Object.keys(flatten(locales.en)).length}, ar=${Object.keys(flatten(locales.ar)).length}`);
}

// Only run main when executed directly (not when imported by tests).
const isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch { return false; }
})();
if (isMain) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
