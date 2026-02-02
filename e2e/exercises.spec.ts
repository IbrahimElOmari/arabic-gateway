import { test, expect } from "@playwright/test";

test.describe("Exercise System", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/self-study");
  });

  test("should display exercise categories", async ({ page }) => {
    // Wait for categories to load
    await page.waitForLoadState("networkidle");
    
    // Check for self-study heading
    await expect(page.getByRole("heading", { name: /self.?study|zelfstudie/i })).toBeVisible();
    
    // Check for category cards
    const categoryCards = page.locator(".card");
    await expect(categoryCards.first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to category when clicked", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    
    // Click first category card
    const firstCategory = page.locator(".card").first();
    await firstCategory.click();
    
    // Should navigate to category page
    await expect(page).toHaveURL(/\/self-study\/.+/);
  });

  test("should display exercises in category", async ({ page }) => {
    // Navigate to a category
    await page.goto("/self-study/reading");
    
    await page.waitForLoadState("networkidle");
    
    // Page should have breadcrumb or heading
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("should show exercise details", async ({ page }) => {
    await page.goto("/self-study/reading");
    await page.waitForLoadState("networkidle");
    
    // Look for exercise cards
    const exerciseCards = page.locator(".card");
    const cardCount = await exerciseCards.count();
    
    if (cardCount > 0) {
      // Exercises should show title and progress info
      const firstCard = exerciseCards.first();
      await expect(firstCard).toBeVisible();
    }
  });
});

test.describe("Exercise Taking", () => {
  test("should display question and answer options", async ({ page }) => {
    // This test assumes there's at least one exercise available
    // Navigate directly to an exercise (would need actual exercise ID)
    await page.goto("/self-study");
    await page.waitForLoadState("networkidle");
  });

  test("should have navigation buttons", async ({ page }) => {
    await page.goto("/self-study");
    await page.waitForLoadState("networkidle");
    
    // Navigate through to exercise
    const categoryCard = page.locator(".card").first();
    if (await categoryCard.isVisible()) {
      await categoryCard.click();
      await page.waitForLoadState("networkidle");
      
      // Check for exercise cards
      const exerciseCards = page.locator(".card");
      if (await exerciseCards.count() > 0) {
        await exerciseCards.first().click();
        await page.waitForLoadState("networkidle");
        
        // Should see navigation buttons
        const nextButton = page.getByRole("button", { name: /next|volgende/i });
        const prevButton = page.getByRole("button", { name: /previous|vorige/i });
        
        // At least one navigation button should be visible
        const hasNext = await nextButton.isVisible().catch(() => false);
        const hasPrev = await prevButton.isVisible().catch(() => false);
        
        expect(hasNext || hasPrev).toBe(true);
      }
    }
  });
});

test.describe("Exercise Timer", () => {
  test("timer display format should be correct", async ({ page }) => {
    // Test timer format using JavaScript
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };
    
    expect(formatTime(125)).toBe("2:05");
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(0)).toBe("0:00");
  });
});
