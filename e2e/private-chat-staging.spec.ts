import { test, expect, type Page } from "@playwright/test";

/**
 * E2E (staging): private chat send + realtime reconnect.
 *
 * Runs against the staging environment. Requires the following env vars:
 *   - STAGING_BASE_URL
 *   - STAGING_USER_EMAIL / STAGING_USER_PASSWORD
 *   - STAGING_PEER_EMAIL (optional: name to start a conversation with)
 *
 * If any required var is missing the suite is skipped instead of failing,
 * so it can sit alongside the regular Playwright run without breaking CI.
 */

const BASE = process.env.STAGING_BASE_URL;
const EMAIL = process.env.STAGING_USER_EMAIL;
const PASSWORD = process.env.STAGING_USER_PASSWORD;
const PEER = process.env.STAGING_PEER_EMAIL ?? "";

const ready = Boolean(BASE && EMAIL && PASSWORD);

test.describe("Private chat — staging", () => {
  test.skip(!ready, "Staging env vars not configured (STAGING_BASE_URL/USER_EMAIL/PASSWORD).");

  async function login(page: Page) {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/e-?mail/i).fill(EMAIL!);
    await page.getByLabel(/wachtwoord|password/i).fill(PASSWORD!);
    await page.getByRole("button", { name: /inloggen|log in|sign in/i }).click();
    await page.waitForURL(/\/(dashboard|chat|$)/, { timeout: 15_000 });
  }

  async function openPrivateChat(page: Page) {
    await page.goto(`${BASE}/chat`);
    await page.getByRole("tab", { name: /privé|private/i }).click();
  }

  test("user can send a private chat message", async ({ page }) => {
    await login(page);
    await openPrivateChat(page);

    // Open an existing conversation OR start a new one with PEER.
    const firstRoom = page.locator("button:has(.truncate)").first();
    if (await firstRoom.count() === 0 && PEER) {
      await page.getByRole("button", { name: /nieuw gesprek|new conversation/i }).click();
      await page.getByPlaceholder(/zoek|search/i).fill(PEER);
      await page.locator("button:has-text('" + PEER + "')").first().click();
    } else {
      await firstRoom.click();
    }

    const input = page.getByLabel(/berichtinvoer|message input/i).last();
    await expect(input).toBeVisible({ timeout: 10_000 });

    const content = `e2e ping ${Date.now()}`;
    await input.fill(content);
    await page.getByRole("button", { name: /bericht versturen|send/i }).last().click();

    // Either the message appears OR a failed-send banner appears.
    await expect(
      page.locator(`text=${content}`).or(page.getByTestId("chat-send-failed")),
    ).toBeVisible({ timeout: 10_000 });

    // We assert the success path here:
    await expect(page.locator(`text=${content}`)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("chat-send-failed")).toHaveCount(0);
  });

  test("realtime goes live again after reconnect", async ({ page, context }) => {
    await login(page);
    await openPrivateChat(page);
    const firstRoom = page.locator("button:has(.truncate)").first();
    await expect(firstRoom).toBeVisible({ timeout: 10_000 });
    await firstRoom.click();

    // Wait until realtime "connecting" disappears (= SUBSCRIBED).
    await expect(page.locator("text=/Verbinden|Connecting/i")).toHaveCount(0, { timeout: 15_000 });

    // Force a reconnect by toggling network offline → online.
    await context.setOffline(true);
    await page.waitForTimeout(2000);
    await context.setOffline(false);

    // Either no error banner OR retry button gets us back to live.
    const errBanner = page.getByRole("alert").filter({ hasText: /live-verbinding|realtime|connection/i });
    if (await errBanner.count() > 0) {
      await page.getByRole("button", { name: /opnieuw|retry/i }).first().click();
    }
    await expect(errBanner).toHaveCount(0, { timeout: 20_000 });
  });
});
