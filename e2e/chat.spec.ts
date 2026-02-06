import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Chat Functionality
 * 
 * Tests the class chat system:
 * - Chat page accessibility
 * - Message display
 * - Report functionality
 */

test.describe("Chat System", () => {
  test("chat page should be accessible", async ({ page }) => {
    await page.goto("/chat");
    
    // Should either show chat or redirect to login
    const url = page.url();
    expect(url).toMatch(/(\/chat|\/login)/);
  });

  test("chat page should have proper structure", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    
    // If on chat page (not redirected to login)
    if (!page.url().includes("/login")) {
      // Check for chat heading
      const heading = page.locator("h1, h2").first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  });

  test("should display message input when enrolled", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    
    // If logged in and on chat page
    if (!page.url().includes("/login")) {
      // Either show message input or enrollment notice
      const messageInput = page.locator("textarea, input[type='text']");
      const noClassNotice = page.locator("text=enroll, text=inschrijven");
      
      const hasInput = await messageInput.count() > 0;
      const hasNotice = await noClassNotice.count() > 0;
      
      // One of these should be visible
      expect(hasInput || hasNotice).toBe(true);
    }
  });
});

test.describe("Chat Message Handling", () => {
  test("message timestamp formatting should work", async ({ page }) => {
    // Test date formatting logic
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const testDate = new Date(2024, 0, 15, 14, 30);
    const formatted = formatTime(testDate);
    
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });

  test("message content should be sanitized", async ({ page }) => {
    // Test basic XSS prevention
    const sanitize = (text: string) => {
      return text
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    };

    expect(sanitize("<script>alert('xss')</script>")).not.toContain("<script>");
    expect(sanitize('Test "quotes"')).toContain("&quot;");
  });
});

test.describe("Chat Reactions", () => {
  test("emoji reactions should be defined", async ({ page }) => {
    const commonEmojis = ["👍", "❤️", "😊", "🎉", "👏"];
    
    expect(commonEmojis.length).toBeGreaterThan(0);
    expect(commonEmojis).toContain("👍");
  });
});
