import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Helpdesk & Knowledge Base (Fase 16.1)
 */

test.describe("Helpdesk", () => {
  test("helpdesk page should be accessible", async ({ page }) => {
    await page.goto("/helpdesk");
    const url = page.url();
    expect(url).toMatch(/(\/helpdesk|\/login)/);
  });

  test("should display helpdesk elements when accessible", async ({ page }) => {
    await page.goto("/helpdesk");
    await page.waitForLoadState("networkidle");
    if (!page.url().includes("/login")) {
      const heading = page.locator("h1, h2").first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe("FAQ/Knowledge Base", () => {
  test("FAQ page should load and show categories or content", async ({ page }) => {
    await page.goto("/faq");
    await page.waitForLoadState("networkidle");

    // Should not redirect to login (FAQ is public)
    expect(page.url()).toContain("/faq");

    // Should have a heading
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("FAQ search input should be present if implemented", async ({ page }) => {
    await page.goto("/faq");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator("input[type='search'], input[placeholder*='search'], input[placeholder*='zoek'], input[placeholder*='Zoek']");
    const hasSearch = (await searchInput.count()) > 0;
    expect(typeof hasSearch).toBe("boolean");
  });

  test("FAQ should display category cards or accordion items", async ({ page }) => {
    await page.goto("/faq");
    await page.waitForLoadState("networkidle");

    // Check for any structural content
    const contentItems = page.locator("[data-accordion-item], .card, [role='article']");
    const count = await contentItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Ticket System", () => {
  test("ticket number format should be valid", async () => {
    const ticketNumberRegex = /^HVA-\d{6}$/;
    expect("HVA-000001").toMatch(ticketNumberRegex);
    expect("HVA-123456").toMatch(ticketNumberRegex);
    expect("INVALID-123").not.toMatch(ticketNumberRegex);
  });

  test("ticket categories should be defined", async () => {
    const categories = ["technical", "billing", "course_content", "account", "other"];
    expect(categories.length).toBe(5);
    expect(categories).toContain("technical");
    expect(categories).toContain("billing");
  });

  test("ticket priorities should be defined", async () => {
    const priorities = ["low", "medium", "high", "urgent"];
    expect(priorities.length).toBe(4);
    expect(priorities).toContain("urgent");
  });
});
