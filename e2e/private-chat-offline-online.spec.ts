import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * E2E: private chat round-trip with offline → online recovery.
 *
 * Verifies:
 *   1. Sender posts a message and it appears in their own thread.
 *   2. Receiver (second browser context) sees the same message — first via
 *      the realtime channel, and if that is offline, via the polling fallback.
 *   3. After toggling the sender offline and back online, the next send still
 *      reaches the receiver (retry/backoff + polling fallback path).
 *
 * Requires env vars:
 *   STAGING_BASE_URL, STAGING_USER_EMAIL, STAGING_USER_PASSWORD,
 *   STAGING_PEER_EMAIL, STAGING_PEER_PASSWORD
 * Skips cleanly if any are missing so this never breaks CI.
 */

const BASE = process.env.STAGING_BASE_URL;
const A_EMAIL = process.env.STAGING_USER_EMAIL;
const A_PASS = process.env.STAGING_USER_PASSWORD;
const B_EMAIL = process.env.STAGING_PEER_EMAIL;
const B_PASS = process.env.STAGING_PEER_PASSWORD;

const ready = Boolean(BASE && A_EMAIL && A_PASS && B_EMAIL && B_PASS);

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/wachtwoord|password/i).fill(password);
  await page.getByRole("button", { name: /inloggen|log in|sign in/i }).click();
  await page.waitForURL(/\/(dashboard|chat|$)/, { timeout: 15_000 });
}

async function openPrivateAndFirstRoom(page: Page, peerEmail?: string) {
  await page.goto(`${BASE}/chat`);
  await page.getByRole("tab", { name: /privé|private/i }).click();
  const firstRoom = page.locator("button:has(.truncate)").first();
  if ((await firstRoom.count()) === 0 && peerEmail) {
    await page.getByRole("button", { name: /nieuw gesprek|new conversation/i }).click();
    await page.getByPlaceholder(/zoek|search/i).fill(peerEmail);
    await page.locator(`button:has-text('${peerEmail}')`).first().click();
  } else {
    await firstRoom.click();
  }
}

test.describe("Private chat — offline→online round-trip (staging)", () => {
  test.skip(!ready, "Staging env vars not configured.");

  test("receiver sees message after sender reconnects", async ({ browser }) => {
    const ctxA: BrowserContext = await browser.newContext();
    const ctxB: BrowserContext = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await Promise.all([
        login(pageA, A_EMAIL!, A_PASS!),
        login(pageB, B_EMAIL!, B_PASS!),
      ]);

      await openPrivateAndFirstRoom(pageA, B_EMAIL!);
      await openPrivateAndFirstRoom(pageB, A_EMAIL!);

      // Step 1: baseline send → both see it.
      const msg1 = `e2e baseline ${Date.now()}`;
      await pageA.getByLabel(/berichtinvoer|message input/i).last().fill(msg1);
      await pageA.getByRole("button", { name: /bericht versturen|send/i }).last().click();
      await expect(pageA.locator(`text=${msg1}`)).toBeVisible({ timeout: 10_000 });
      await expect(pageB.locator(`text=${msg1}`)).toBeVisible({ timeout: 15_000 });

      // Step 2: kick sender offline, then online — verify next send still arrives.
      await ctxA.setOffline(true);
      await pageA.waitForTimeout(2500);
      await ctxA.setOffline(false);

      // Wait for either realtime to recover OR polling fallback badge to show.
      await expect(pageA.getByTestId("chat-realtime-status")).toBeVisible({ timeout: 15_000 });

      const msg2 = `e2e recovered ${Date.now()}`;
      await pageA.getByLabel(/berichtinvoer|message input/i).last().fill(msg2);
      await pageA.getByRole("button", { name: /bericht versturen|send/i }).last().click();

      // Sender side: success path (retry logic resolves) — no failure banner sticks.
      await expect(pageA.locator(`text=${msg2}`)).toBeVisible({ timeout: 20_000 });
      await expect(pageA.getByTestId("chat-send-failed")).toHaveCount(0);

      // Receiver side: realtime OR polling fallback must surface the message.
      await expect(pageB.locator(`text=${msg2}`)).toBeVisible({ timeout: 20_000 });

      // Step 3: diagnostics panel exposes correlationId + sentry eventId rows.
      await pageA.getByTestId("chat-open-diagnostics").click();
      const dialog = pageA.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("text=/correlationId/i")).toBeVisible();
      await expect(dialog.locator("text=/sentry/i")).toBeVisible();
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
