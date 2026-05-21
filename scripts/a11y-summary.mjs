#!/usr/bin/env node
/**
 * Aggregates a11y / RTL audit artifacts and writes a markdown summary to
 * $GITHUB_STEP_SUMMARY so the PR check surfaces critical findings inline.
 *
 * Inputs:
 *   - a11y-results/landmarks-*.json   (written by e2e/rtl-landmarks.spec.ts)
 *   - playwright-report/results.json  (optional, when JSON reporter enabled)
 *
 * Exit code is always 0: the underlying Playwright run already fails the
 * build on critical violations; this script only produces a human summary.
 */
import fs from 'node:fs';
import path from 'node:path';

const out = process.env.GITHUB_STEP_SUMMARY;
const write = (line) => {
  if (out) fs.appendFileSync(out, line + '\n');
  else process.stdout.write(line + '\n');
};

write('## ♿ A11y & RTL audit summary');
write('');

const resultsDir = path.resolve('a11y-results');
if (!fs.existsSync(resultsDir)) {
  write('_No a11y-results/ directory — landmark audit did not run._');
  process.exit(0);
}

const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  write('_No audit artifacts found._');
  process.exit(0);
}

const rows = [];
let totalIssues = 0;
for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
    const count = (data.issues || []).length;
    totalIssues += count;
    rows.push({ ...data, count, file: f });
  } catch (e) {
    write(`- ⚠️ failed to parse ${f}: ${e.message}`);
  }
}

write(`**Routes audited:** ${rows.length}  |  **Total issues:** ${totalIssues}`);
write('');
write('| Lang | Dir | Route | Issues |');
write('| ---- | --- | ----- | ------ |');
for (const r of rows.sort((a, b) => b.count - a.count)) {
  write(`| ${r.lang} | ${r.dir} | \`${r.route}\` | ${r.count} |`);
}

const worst = rows.filter((r) => r.count > 0).slice(0, 10);
if (worst.length) {
  write('');
  write('### Top findings');
  for (const r of worst) {
    write('');
    write(`**${r.lang} \`${r.route}\`** — ${r.count} issue(s)`);
    for (const issue of (r.issues || []).slice(0, 8)) {
      write(`- ${issue}`);
    }
    if (r.issues.length > 8) write(`- …and ${r.issues.length - 8} more`);
  }
} else {
  write('');
  write('✅ No landmark / ARIA / lang-dir issues detected.');
}
