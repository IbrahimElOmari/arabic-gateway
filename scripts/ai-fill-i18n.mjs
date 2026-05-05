#!/usr/bin/env node
/**
 * AI-assisted i18n filler.
 *
 * Reads NL/EN/AR locales, finds missing keys per target language, and asks the
 * `ai-translate-i18n` edge function for AI-suggested translations. Suggestions
 * are written back prefixed with `⟦AI⟧ ` so they are easy to grep and review.
 *
 * Usage:
 *   node scripts/ai-fill-i18n.mjs                  # all targets (en + ar)
 *   node scripts/ai-fill-i18n.mjs --target en
 *   node scripts/ai-fill-i18n.mjs --dry-run        # don't write files
 *   node scripts/ai-fill-i18n.mjs --limit 10       # cap entries (debug)
 *
 * Requires an admin auth token (the edge function is admin-only).  Provide it
 * via env var SUPABASE_AUTH_TOKEN, or pass --token <jwt>.
 *
 * Reads SUPABASE_URL / VITE_SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY /
 * VITE_SUPABASE_PUBLISHABLE_KEY from env.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flatten, unflatten } from './check-i18n.mjs';

export const AI_PREFIX = '⟦AI⟧ ';
const BATCH_SIZE = 30;

export function pickMissing(sourceFlat, targetFlat, limit = Infinity) {
  const missing = {};
  let n = 0;
  for (const [k, v] of Object.entries(sourceFlat)) {
    if (n >= limit) break;
    if (!(k in targetFlat) && typeof v === 'string') {
      missing[k] = v;
      n++;
    }
  }
  return missing;
}

export function chunk(obj, size) {
  const entries = Object.entries(obj);
  const out = [];
  for (let i = 0; i < entries.length; i += size) {
    out.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  return out;
}

export function mergeTranslations(targetFlat, translations, prefix = AI_PREFIX) {
  const result = { ...targetFlat };
  const added = [];
  for (const [k, v] of Object.entries(translations)) {
    if (k in result) continue; // never overwrite existing
    result[k] = `${prefix}${v}`;
    added.push(k);
  }
  return { result, added };
}

async function callEdgeFunction({ url, anonKey, authToken, target, entries, fetchImpl = fetch }) {
  const resp = await fetchImpl(`${url}/functions/v1/ai-translate-i18n`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ target, entries }),
  });
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { error: text }; }
  if (!resp.ok) {
    const err = new Error(json?.error || `HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return json;
}

function parseArgs(argv) {
  const args = { target: 'all', dryRun: false, limit: Infinity, token: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') args.target = argv[++i];
    else if (a.startsWith('--target=')) args.target = a.slice(9);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a.startsWith('--limit=')) args.limit = Number(a.slice(8));
    else if (a === '--token') args.token = argv[++i];
    else if (a.startsWith('--token=')) args.token = a.slice(8);
  }
  return args;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const ROOT = join(__filename, '..', '..');
  const LOCALES_DIR = join(ROOT, 'src', 'i18n', 'locales');
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY;
  const token = args.token || process.env.SUPABASE_AUTH_TOKEN;

  if (!url || !anonKey) {
    console.error('❌ Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY env vars.');
    process.exit(1);
  }
  if (!token) {
    console.error('❌ Missing admin auth token. Set SUPABASE_AUTH_TOKEN or pass --token.');
    console.error('   Tip: copy your access token from the browser devtools while logged in as admin.');
    process.exit(1);
  }

  const locales = {};
  for (const lng of ['nl', 'en', 'ar']) {
    locales[lng] = JSON.parse(readFileSync(join(LOCALES_DIR, `${lng}.json`), 'utf8'));
  }
  const nlFlat = flatten(locales.nl);
  const targets = args.target === 'all' ? ['en', 'ar'] : [args.target];

  for (const target of targets) {
    if (!['en', 'ar'].includes(target)) {
      console.error(`❌ Invalid --target "${target}" (use en, ar, or all)`);
      process.exit(1);
    }
    const tgtFlat = flatten(locales[target]);
    const missing = pickMissing(nlFlat, tgtFlat, args.limit);
    const total = Object.keys(missing).length;
    if (total === 0) {
      console.log(`✅ ${target}: nothing missing.`);
      continue;
    }
    console.log(`🤖 ${target}: ${total} missing key(s), ${Math.ceil(total / BATCH_SIZE)} batch(es).`);

    let merged = { ...tgtFlat };
    let totalAdded = 0;
    let totalSkipped = 0;
    const batches = chunk(missing, BATCH_SIZE);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const { translations, skipped = [] } = await callEdgeFunction({
          url, anonKey, authToken: token, target, entries: batch,
        });
        const { result, added } = mergeTranslations(merged, translations);
        merged = result;
        totalAdded += added.length;
        totalSkipped += skipped.length;
        console.log(`   batch ${i + 1}/${batches.length}: +${added.length} added, ${skipped.length} skipped`);
      } catch (e) {
        console.error(`   batch ${i + 1}/${batches.length} failed: ${e.message}`);
        if (e.status === 402 || e.status === 429) {
          console.error('   stopping early due to rate-limit / credits.');
          break;
        }
      }
    }

    if (args.dryRun) {
      console.log(`   (dry-run) would add ${totalAdded} key(s), skipped ${totalSkipped}`);
    } else if (totalAdded > 0) {
      writeFileSync(
        join(LOCALES_DIR, `${target}.json`),
        JSON.stringify(unflatten(merged), null, 2) + '\n',
      );
      console.log(`   ✏️  wrote ${totalAdded} key(s) to ${target}.json (skipped ${totalSkipped})`);
    } else {
      console.log(`   nothing written (skipped ${totalSkipped})`);
    }
  }
  console.log('✅ Done. Review entries prefixed with "⟦AI⟧ " before shipping.');
}

const isMain = (() => {
  try { return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]; }
  catch { return false; }
})();
if (isMain) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
