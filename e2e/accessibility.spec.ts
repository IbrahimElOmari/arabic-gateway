import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * E2E Tests: Accessibility (WCAG 2.1 AA Compliance)
 * 
 * Tests accessibility requirements using axe-core:
 * - Color contrast
 * - Keyboard navigation
 * - ARIA labels
 * - Semantic HTML
 * - Focus management
 */

test.describe('Accessibility', () => {
  test.describe('Homepage', () => {
    test('should not have automatic accessibility violations', async ({ page }) => {
      await page.goto('/');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      // Log violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have a single h1 heading', async ({ page }) => {
      await page.goto('/');
      
      const h1Elements = page.locator('h1');
      const count = await h1Elements.count();
      
      expect(count).toBe(1);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Check that headings don't skip levels
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      let lastLevel = 0;
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const level = parseInt(tagName.replace('h', ''));
        
        // Heading level should not skip more than one level
        expect(level - lastLevel).toBeLessThanOrEqual(1);
        lastLevel = level;
      }
    });

    test('should have main landmark', async ({ page }) => {
      await page.goto('/');
      
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });
  });

  test.describe('Login Page', () => {
    test('should not have accessibility violations', async ({ page }) => {
      await page.goto('/login');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/login');
      
      // Email input should have a label
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toBeVisible();
      
      // Password input should have a label
      const passwordInput = page.getByLabel(/password|wachtwoord/i);
      await expect(passwordInput).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(firstFocused);
      
      await page.keyboard.press('Tab');
      const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(secondFocused);
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/login');
      
      const emailInput = page.getByLabel(/email/i);
      await emailInput.focus();
      
      // Check that focus is visible (element should have focus ring or outline)
      const focusStyles = await emailInput.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
        };
      });
      
      // Should have some visible focus indicator
      const hasVisibleFocus = 
        focusStyles.outline !== 'none' || 
        focusStyles.boxShadow !== 'none';
      
      expect(hasVisibleFocus).toBe(true);
    });
  });

  test.describe('Register Page', () => {
    test('should not have accessibility violations', async ({ page }) => {
      await page.goto('/register');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible form fields', async ({ page }) => {
      await page.goto('/register');
      
      // All form inputs should be associated with labels
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const hasLabel = await input.evaluate(el => {
          // Check for associated label
          const id = el.id;
          if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) return true;
          }
          // Check for parent label
          return el.closest('label') !== null;
        });
        
        // Input should have associated label or aria-label
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast on homepage', async ({ page }) => {
      await page.goto('/');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('body')
        .analyze();
      
      // Filter for color contrast violations specifically
      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );
      
      expect(contrastViolations).toEqual([]);
    });
  });

  test.describe('Images', () => {
    test('should have alt text on all images', async ({ page }) => {
      await page.goto('/');
      
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        
        // Image should have alt text (can be empty for decorative images)
        // or role="presentation" for decorative images
        expect(alt !== null || role === 'presentation').toBe(true);
      }
    });
  });

  test.describe('Buttons', () => {
    test('should have accessible names', async ({ page }) => {
      await page.goto('/');
      
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const accessibleName = await button.evaluate(el => {
          // Check text content
          const text = el.textContent?.trim();
          if (text) return text;
          
          // Check aria-label
          const ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel) return ariaLabel;
          
          // Check aria-labelledby
          const labelledBy = el.getAttribute('aria-labelledby');
          if (labelledBy) {
            const labelEl = document.getElementById(labelledBy);
            if (labelEl) return labelEl.textContent;
          }
          
          // Check for title
          const title = el.getAttribute('title');
          if (title) return title;
          
          return null;
        });
        
        expect(accessibleName).not.toBeNull();
      }
    });
  });

  test.describe('Language', () => {
    test('should have lang attribute on html element', async ({ page }) => {
      await page.goto('/');
      
      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBeTruthy();
    });
  });

  test.describe('Skip Links', () => {
    test.skip('should have skip to main content link', async ({ page }) => {
      await page.goto('/');
      
      // Skip link should be first focusable element
      await page.keyboard.press('Tab');
      
      const skipLink = page.locator('a[href="#main-content"], a:has-text("Skip to content")');
      const isVisible = await skipLink.isVisible();
      
      // Skip link should exist (may be visible only on focus)
      const exists = await skipLink.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('RTL Support', () => {
    test.skip('should support RTL direction for Arabic', async ({ page }) => {
      await page.goto('/');
      
      // Switch to Arabic (if language switcher exists)
      const langSwitcher = page.locator('[aria-label*="language"], [data-testid="language-switcher"]');
      
      if (await langSwitcher.isVisible()) {
        await langSwitcher.click();
        
        // Select Arabic
        const arabicOption = page.locator('text=العربية, text=Arabic');
        if (await arabicOption.isVisible()) {
          await arabicOption.click();
          
          // Check RTL direction
          const dir = await page.locator('html').getAttribute('dir');
          expect(dir).toBe('rtl');
        }
      }
    });
  });
});
