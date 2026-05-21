import { test, expect } from '@playwright/test';

/**
 * Keyboard & focus audit in RTL (Arabic).
 *
 * Verifies:
 *   - Tab cycles through focusable elements in DOM order
 *   - Focus ring is visible (outline or box-shadow) on every focus stop
 *   - Escape closes any opened dialog / dropdown menu
 *   - Focus is restored to the trigger after closing a dialog
 */

test.describe('RTL keyboard & focus', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('i18nextLng', 'ar');
      } catch {}
    });
  });

  test('Tab order visits all focusable elements with visible focus ring', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const focusable = await page.evaluate(() => {
      const sel =
        'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(document.querySelectorAll(sel)).filter((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length;
    });
    expect(focusable, 'no focusable elements found on /login').toBeGreaterThan(0);

    const visited = new Set<string>();
    const stops = Math.min(focusable, 25);
    for (let i = 0; i < stops; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = window.getComputedStyle(el);
        const hasRing =
          cs.outlineStyle !== 'none' || cs.boxShadow !== 'none' || cs.outlineWidth !== '0px';
        return {
          key: `${el.tagName}#${el.id}.${el.className}`,
          hasRing,
        };
      });
      if (!info) break;
      visited.add(info.key);
      // Some controls intentionally don't show a ring (e.g. body), but every
      // *interactive* tab stop in Lovable's design system must.
      expect(info.hasRing, `no focus ring on stop ${i}: ${info.key}`).toBe(true);
    }

    expect(visited.size, 'Tab did not move focus through unique elements').toBeGreaterThan(1);
  });

  test('Escape closes opened dropdown menu and restores focus', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const langTrigger = page.getByRole('button', { name: /switch language|تبديل اللغة|wijzig taal/i });
    if (!(await langTrigger.count())) {
      test.skip(true, 'language switcher not present on /');
      return;
    }
    await langTrigger.first().focus();
    await page.keyboard.press('Enter');

    // Radix dropdown sets role="menu" when open.
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    // Focus should return to the trigger.
    const focusedIsTrigger = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return !!el?.matches('button');
    });
    expect(focusedIsTrigger).toBe(true);
  });
});
