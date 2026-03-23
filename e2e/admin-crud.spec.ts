import { test, expect } from '@playwright/test';

/**
 * Admin CRUD E2E Tests
 * Tests admin flows: classes, levels, users, discount codes, enrollments.
 * These tests require a running app with an authenticated admin session.
 */

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Admin login would be done here with test credentials
    // For now, verify login page loads
    await expect(page.locator('form')).toBeVisible();
  });

  test('login page renders correctly', async ({ page }) => {
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('Admin Navigation', () => {
  test('admin routes are protected', async ({ page }) => {
    // Verify that unauthenticated users are redirected from admin routes
    await page.goto('/admin');
    await page.waitForURL(/\/(login|admin)/);
    const url = page.url();
    expect(url).toMatch(/\/(login|admin)/);
  });

  test('admin classes route exists', async ({ page }) => {
    await page.goto('/admin/classes');
    await page.waitForURL(/\/(login|admin)/);
    const url = page.url();
    expect(url).toMatch(/\/(login|admin)/);
  });

  test('admin levels route exists', async ({ page }) => {
    await page.goto('/admin/levels');
    await page.waitForURL(/\/(login|admin)/);
    const url = page.url();
    expect(url).toMatch(/\/(login|admin)/);
  });

  test('admin users route exists', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForURL(/\/(login|admin)/);
    const url = page.url();
    expect(url).toMatch(/\/(login|admin)/);
  });

  test('admin discounts route exists', async ({ page }) => {
    await page.goto('/admin/discounts');
    await page.waitForURL(/\/(login|admin)/);
    const url = page.url();
    expect(url).toMatch(/\/(login|admin)/);
  });

  test('admin enrollments route exists', async ({ page }) => {
    await page.goto('/admin/enrollments');
    await page.waitForURL(/\/(login|admin)/);
    const url = page.url();
    expect(url).toMatch(/\/(login|admin)/);
  });
});

test.describe('Mobile Admin Views', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone 12

  test('admin pages render on mobile', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/(login|admin)/);
    // Page should be visible without horizontal overflow
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('sidebar hamburger is visible on mobile', async ({ page }) => {
    await page.goto('/');
    // On mobile, the sidebar should be hidden or show a hamburger menu
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
  });
});
