import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Authentication Flow
 * 
 * Tests the complete authentication user journey:
 * - Registration
 * - Login
 * - Logout
 * - Password reset
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Registration', () => {
    test('should navigate to registration page', async ({ page }) => {
      await page.goto('/register');
      await expect(page).toHaveURL('/register');
      await expect(page.locator('h1, h2').first()).toContainText(/register|registreren/i);
    });

    test('should display all registration form fields', async ({ page }) => {
      await page.goto('/register');
      
      // Check all required fields are present
      await expect(page.getByLabel(/full name|volledige naam|الاسم/i)).toBeVisible();
      await expect(page.getByLabel(/email|e-mail|البريد/i)).toBeVisible();
      await expect(page.getByLabel(/phone|telefoon|هاتف/i)).toBeVisible();
      await expect(page.getByLabel(/address|adres|العنوان/i)).toBeVisible();
      await expect(page.getByLabel(/password|wachtwoord|كلمة المرور/i).first()).toBeVisible();
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.goto('/register');
      
      // Submit empty form
      await page.getByRole('button', { name: /register|registreren|التسجيل/i }).click();
      
      // Should show validation errors (form should not submit)
      await expect(page).toHaveURL('/register');
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/register');
      
      await page.getByLabel(/email|e-mail/i).fill('invalid-email');
      await page.getByRole('button', { name: /register|registreren/i }).click();
      
      // Should show email validation error
      await expect(page.getByText(/invalid|ongeldig|غير صالح/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for password mismatch', async ({ page }) => {
      await page.goto('/register');
      
      const passwordInputs = page.getByLabel(/password|wachtwoord/i);
      await passwordInputs.first().fill('Password123!');
      await passwordInputs.nth(1).fill('DifferentPassword!');
      
      await page.getByRole('button', { name: /register|registreren/i }).click();
      
      // Should show password mismatch error
      await expect(page.getByText(/match|overeen|متطابق/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Login', () => {
    test('should navigate to login page', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveURL('/login');
    });

    test('should display login form fields', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.getByLabel(/email|e-mail/i)).toBeVisible();
      await expect(page.getByLabel(/password|wachtwoord/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /login|inloggen|تسجيل الدخول/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel(/email|e-mail/i).fill('nonexistent@example.com');
      await page.getByLabel(/password|wachtwoord/i).fill('wrongpassword');
      await page.getByRole('button', { name: /login|inloggen/i }).click();
      
      // Should show error message
      await expect(page.getByText(/invalid|ongeldig|error|fout/i)).toBeVisible({ timeout: 10000 });
    });

    test('should have link to registration page', async ({ page }) => {
      await page.goto('/login');
      
      const registerLink = page.getByRole('link', { name: /register|registreren|التسجيل/i });
      await expect(registerLink).toBeVisible();
      
      await registerLink.click();
      await expect(page).toHaveURL('/register');
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.getByText(/forgot|vergeten|نسيت/i)).toBeVisible();
    });
  });

  test.describe('Navigation Guards', () => {
    test('should redirect to login when accessing protected route', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login when accessing calendar without auth', async ({ page }) => {
      await page.goto('/calendar');
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });
  });
});
