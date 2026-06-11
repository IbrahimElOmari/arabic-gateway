import { test, expect, request } from '@playwright/test';

/**
 * E2E: Turnstile captcha on login/register.
 *
 * Cloudflare publishes deterministic test keys (https://developers.cloudflare.com/turnstile/troubleshooting/testing/):
 *   sitekey 1x00000000000000000000AA  → always passes (client)
 *   sitekey 2x00000000000000000000AB  → always blocks
 *   secret  1x0000000000000000000000000000000AA → always passes (server)
 *   secret  2x0000000000000000000000000000000AA → always fails
 *
 * Staging is configured with the always-pass sitekey + always-pass secret so the
 * happy path runs end-to-end. Invalid-token and rate-limit scenarios hit the
 * verify-captcha edge function directly with a forged token.
 */

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const ANON =
  process.env.E2E_SUPABASE_ANON ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

test.describe('Turnstile captcha', () => {
  test('login page renders the Turnstile widget when sitekey is set', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    // Cloudflare injects an iframe from challenges.cloudflare.com
    const iframe = page.locator('iframe[src*="challenges.cloudflare.com"]').first();
    await expect(iframe).toBeVisible({ timeout: 15_000 });
  });

  test('register page renders the Turnstile widget', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    const iframe = page.locator('iframe[src*="challenges.cloudflare.com"]').first();
    await expect(iframe).toBeVisible({ timeout: 15_000 });
  });

  test('verify-captcha rejects invalid tokens with 403', async () => {
    test.skip(!SUPABASE_URL || !ANON, 'Supabase URL/anon not configured for this run');
    const api = await request.newContext();
    const res = await api.post(
      `${SUPABASE_URL}/functions/v1/verify-captcha`,
      {
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        data: { token: 'this-is-not-a-real-cloudflare-token' },
      },
    );
    expect([400, 403]).toContain(res.status());
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('verify-captcha rate limits aggressive callers (429 after >30 rps)', async () => {
    test.skip(!SUPABASE_URL || !ANON, 'Supabase URL/anon not configured for this run');
    const api = await request.newContext();
    let sawRateLimit = false;
    for (let i = 0; i < 50; i++) {
      const res = await api.post(
        `${SUPABASE_URL}/functions/v1/verify-captcha`,
        {
          headers: { apikey: ANON, 'Content-Type': 'application/json' },
          data: { token: `flood-${i}` },
        },
      );
      if (res.status() === 429) {
        sawRateLimit = true;
        break;
      }
    }
    expect(sawRateLimit).toBe(true);
  });
});
