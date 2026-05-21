import { test, expect } from '@playwright/test';

/**
 * Runtime language-switch audit.
 *
 * Verifies that switching language via i18next (NL → EN → AR → NL) updates
 *   - <html dir> and <html lang>
 *   - layout direction (no horizontal overflow appears)
 * WITHOUT a full page reload (navigation count stays at 1).
 */

const LANGS = [
  { code: 'nl', dir: 'ltr' },
  { code: 'en', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
  { code: 'nl', dir: 'ltr' },
] as const;

test('language switch updates dir/lang/overflow without reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Mark the window so we can detect a hard reload.
  await page.evaluate(() => {
    (window as unknown as { __noReload: boolean }).__noReload = true;
  });

  for (const { code, dir } of LANGS) {
    await page.evaluate(async (lng) => {
      // i18next is initialised in src/i18n/index.ts and attached to the
      // react-i18next module — call changeLanguage via the global instance.
      const mod = await import('/src/i18n/index.ts');
      await mod.default.changeLanguage(lng);
    }, code);

    // Allow React to flush.
    await page.waitForTimeout(150);

    const html = page.locator('html');
    await expect(html, `dir for ${code}`).toHaveAttribute('dir', dir);
    await expect(html, `lang for ${code}`).toHaveAttribute('lang', code);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `overflow for ${code}`).toBeLessThanOrEqual(clientWidth + 1);

    // No full reload happened.
    const stillNoReload = await page.evaluate(
      () => (window as unknown as { __noReload?: boolean }).__noReload === true
    );
    expect(stillNoReload, `page reloaded during switch to ${code}`).toBe(true);
  }
});
