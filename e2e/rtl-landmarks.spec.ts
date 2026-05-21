import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Landmark / aria / lang-dir consistency audit per language route.
 *
 * For every supported language and every public route we verify:
 *   - <html lang> matches the active language
 *   - <html dir> matches expected direction
 *   - exactly one <main> landmark exists
 *   - all <button> elements have an accessible name
 *   - all <img> elements have alt (or role="presentation")
 *   - every form control has a label / aria-label / aria-labelledby
 *   - icon-only buttons (no text) have aria-label
 */

const LANGS = [
  { code: 'nl', dir: 'ltr' },
  { code: 'en', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
] as const;

const ROUTES = ['/', '/login', '/register', '/pricing'];

const RESULTS_DIR = path.resolve('a11y-results');
fs.mkdirSync(RESULTS_DIR, { recursive: true });

for (const { code, dir } of LANGS) {
  test.describe(`landmarks/${code}`, () => {
    test.beforeEach(async ({ context }) => {
      await context.addInitScript((lng) => {
        try {
          localStorage.setItem('i18nextLng', lng);
        } catch {}
      }, code);
    });

    for (const route of ROUTES) {
      test(`${route} – consistent landmarks & ARIA in ${code}`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        const html = page.locator('html');
        await expect(html).toHaveAttribute('lang', code);
        await expect(html).toHaveAttribute('dir', dir);

        const audit = await page.evaluate(() => {
          const issues: string[] = [];

          const mains = document.querySelectorAll('main');
          if (mains.length !== 1) issues.push(`expected 1 <main>, found ${mains.length}`);

          document.querySelectorAll('button').forEach((b, i) => {
            const name =
              b.textContent?.trim() ||
              b.getAttribute('aria-label') ||
              b.getAttribute('title') ||
              (b.getAttribute('aria-labelledby')
                ? document.getElementById(b.getAttribute('aria-labelledby')!)?.textContent
                : null);
            if (!name) issues.push(`button[${i}] missing accessible name`);
          });

          document.querySelectorAll('img').forEach((img, i) => {
            const alt = img.getAttribute('alt');
            const role = img.getAttribute('role');
            if (alt === null && role !== 'presentation') {
              issues.push(`img[${i}] missing alt`);
            }
          });

          document.querySelectorAll('input, select, textarea').forEach((el, i) => {
            const id = el.getAttribute('id');
            const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledBy = el.getAttribute('aria-labelledby');
            const type = (el as HTMLInputElement).type;
            if (type === 'hidden') return;
            if (!hasLabel && !ariaLabel && !ariaLabelledBy && !el.closest('label')) {
              issues.push(`${el.tagName.toLowerCase()}[${i}] missing label`);
            }
          });

          return issues;
        });

        fs.writeFileSync(
          path.join(RESULTS_DIR, `landmarks-${code}-${route.replace(/\W+/g, '_') || 'root'}.json`),
          JSON.stringify({ route, lang: code, dir, issues: audit }, null, 2)
        );

        expect(audit, `landmark/aria issues on ${route} (${code})`).toEqual([]);
      });
    }
  });
}
