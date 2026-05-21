import { test, expect } from '@playwright/test';

/**
 * Visual regression — RTL (Arabic).
 *
 * Captures full-page screenshots of key routes in Arabic and diff them
 * against committed baselines. Run baselines via:
 *   npx playwright test e2e/rtl-visual.spec.ts --update-snapshots
 *
 * Diffs > 1% pixel ratio fail the build, surfacing layout/spacing breaks
 * (mirrored padding, misaligned icons, overflowing text) introduced by RTL.
 */

const ROUTES = ['/', '/login', '/register', '/pricing'];

test.describe('RTL visual regression', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('i18nextLng', 'ar');
      } catch {}
    });
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  for (const route of ROUTES) {
    test(`visual baseline ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      // Disable animations to stabilise diffs.
      await page.addStyleTag({
        content: `*, *::before, *::after {
          transition: none !important;
          animation: none !important;
          caret-color: transparent !important;
        }`,
      });
      await expect(page).toHaveScreenshot(`rtl${route.replace(/\W+/g, '_') || '_root'}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
      });
    });
  }
});
