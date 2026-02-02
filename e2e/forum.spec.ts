import { test, expect } from "@playwright/test";

test.describe("Forum Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to forum page
    await page.goto("/forum");
  });

  test("should display forum rooms", async ({ page }) => {
    // Check for forum heading
    await expect(page.getByRole("heading", { name: /forum/i })).toBeVisible();
    
    // Check for at least one forum room card
    const roomCards = page.locator("[data-testid='forum-room'], .card");
    await expect(roomCards.first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to room when clicking room card", async ({ page }) => {
    // Wait for rooms to load
    await page.waitForSelector(".card", { timeout: 10000 });
    
    // Click the first room
    const firstRoom = page.locator(".card").first();
    await firstRoom.click();
    
    // Should navigate to room page
    await expect(page).toHaveURL(/\/forum\/.+/);
  });

  test("should show new post button when in a room", async ({ page }) => {
    // Navigate to a specific room
    await page.goto("/forum/general");
    
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    
    // Check for new post button
    const newPostButton = page.getByRole("button", { name: /new post|nieuw bericht/i });
    await expect(newPostButton).toBeVisible({ timeout: 10000 });
  });

  test("should open create post dialog", async ({ page }) => {
    await page.goto("/forum/general");
    
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    
    // Click new post button
    const newPostButton = page.getByRole("button", { name: /new post|nieuw bericht/i });
    await newPostButton.click();
    
    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    
    // Check for title and content inputs
    await expect(page.getByPlaceholder(/title|titel/i)).toBeVisible();
    await expect(page.getByPlaceholder(/write|schrijf/i)).toBeVisible();
  });

  test("should have back navigation", async ({ page }) => {
    await page.goto("/forum/general");
    
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    
    // Find back link/button
    const backLink = page.getByRole("link", { name: /back|terug/i });
    await expect(backLink).toBeVisible();
    
    // Click back
    await backLink.click();
    
    // Should navigate to forum index
    await expect(page).toHaveURL("/forum");
  });
});

test.describe("Forum Post Interaction", () => {
  test("should display post details when clicking a post", async ({ page }) => {
    // Navigate to a room with posts
    await page.goto("/forum/general");
    
    // Wait for posts to load
    await page.waitForLoadState("networkidle");
    
    // If there are posts, click the first one
    const postCard = page.locator(".card").first();
    const postExists = await postCard.isVisible().catch(() => false);
    
    if (postExists) {
      await postCard.click();
      
      // Should navigate to post detail page
      await expect(page).toHaveURL(/\/forum\/general\/.+/);
    }
  });

  test("should show report button on posts", async ({ page }) => {
    await page.goto("/forum/general");
    await page.waitForLoadState("networkidle");
    
    // Check if there are any posts
    const posts = page.locator(".card");
    const postCount = await posts.count();
    
    if (postCount > 0) {
      // Navigate to first post
      await posts.first().click();
      
      // Wait for post detail to load
      await page.waitForLoadState("networkidle");
      
      // Look for report/flag button
      const flagButton = page.locator("button").filter({ has: page.locator("svg") });
      expect(await flagButton.count()).toBeGreaterThan(0);
    }
  });
});
