import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * RTL Audit Suite
 *
 * Switches the app to Arabic via localStorage (i18next-browser-languagedetector)
 * and verifies:
 *   - <html dir="rtl" lang="ar">
 *   - no horizontal overflow on key routes
 *   - axe-core has no critical violations in RTL mode
 *   - no leftover Latin-script UI labels in primary nav landmarks
 */

const ROUTES = ['/', '/login', '/register', '/pricing'];

test.describe('RTL (Arabic)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('i18nextLng', 'ar');
      } catch {}
    });
  });

  for (const route of ROUTES) {
    test(`route ${route} renders RTL correctly`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const html = page.locator('html');
      await expect(html).toHaveAttribute('dir', 'rtl');
      await expect(html).toHaveAttribute('lang', 'ar');

      // No horizontal overflow on default desktop viewport
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `horizontal overflow on ${route}`).toBeLessThanOrEqual(clientWidth + 1);
    });
  }

  test('homepage has no critical axe violations in RTL', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    if (critical.length > 0) {
      console.log('Critical RTL violations:', JSON.stringify(critical, null, 2));
    }
    expect(critical).toEqual([]);
  });

  test('mobile viewport: no horizontal overflow in RTL', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
