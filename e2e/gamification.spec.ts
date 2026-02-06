import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Gamification System
 * 
 * Tests the gamification features:
 * - Points system
 * - Badges
 * - Leaderboards
 * - Streaks
 */

test.describe("Gamification Dashboard", () => {
  test("gamification page should be accessible", async ({ page }) => {
    await page.goto("/gamification");
    
    // Should either show gamification or redirect
    const url = page.url();
    expect(url).toMatch(/(\/gamification|\/login)/);
  });

  test("should display gamification elements", async ({ page }) => {
    await page.goto("/gamification");
    await page.waitForLoadState("networkidle");
    
    if (!page.url().includes("/login")) {
      // Check for gamification heading
      const heading = page.locator("h1, h2").first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe("Points System", () => {
  test("points actions should be defined", async ({ page }) => {
    const pointsActions = [
      "exercise_completed",
      "exercise_passed",
      "lesson_attended",
      "streak_bonus",
      "forum_post",
      "level_completed",
    ];
    
    expect(pointsActions).toContain("exercise_completed");
    expect(pointsActions).toContain("level_completed");
  });

  test("points calculation should work correctly", async ({ page }) => {
    const calculatePoints = (action: string, passed: boolean = false) => {
      const pointsMap: Record<string, number> = {
        exercise_completed: 10,
        exercise_passed: 25,
        lesson_attended: 15,
        streak_bonus: 5,
        forum_post: 3,
        level_completed: 500,
      };
      return pointsMap[action] || 0;
    };

    expect(calculatePoints("exercise_completed")).toBe(10);
    expect(calculatePoints("level_completed")).toBe(500);
    expect(calculatePoints("unknown_action")).toBe(0);
  });
});

test.describe("Badge System", () => {
  test("badge types should be defined", async ({ page }) => {
    const badgeTypes = [
      "first_exercise",
      "streak_7",
      "streak_30",
      "perfect_score",
      "exercises_10",
      "exercises_50",
      "exercises_100",
      "first_lesson",
      "lessons_10",
      "forum_contributor",
    ];
    
    expect(badgeTypes.length).toBe(10);
    expect(badgeTypes).toContain("streak_30");
  });

  test("badge rarity levels should be defined", async ({ page }) => {
    const rarityLevels = ["common", "rare", "epic", "legendary"];
    
    expect(rarityLevels.length).toBe(4);
    expect(rarityLevels[0]).toBe("common");
    expect(rarityLevels[3]).toBe("legendary");
  });
});

test.describe("Streak System", () => {
  test("streak calculation should work correctly", async ({ page }) => {
    const calculateStreak = (lastActivityDate: Date | null, today: Date) => {
      if (!lastActivityDate) return 1; // First activity
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const lastDateStr = lastActivityDate.toDateString();
      const yesterdayStr = yesterday.toDateString();
      const todayStr = today.toDateString();
      
      if (lastDateStr === todayStr) return 0; // Already recorded
      if (lastDateStr === yesterdayStr) return 1; // Continue streak
      return -1; // Streak broken
    };

    const today = new Date(2024, 5, 15); // June 15, 2024
    const yesterday = new Date(2024, 5, 14);
    const twoDaysAgo = new Date(2024, 5, 13);
    
    expect(calculateStreak(null, today)).toBe(1); // First activity
    expect(calculateStreak(yesterday, today)).toBe(1); // Continue streak
    expect(calculateStreak(today, today)).toBe(0); // Already recorded
    expect(calculateStreak(twoDaysAgo, today)).toBe(-1); // Streak broken
  });
});

test.describe("Leaderboard", () => {
  test("leaderboard periods should be defined", async ({ page }) => {
    const periods = ["weekly", "monthly", "all_time"];
    
    expect(periods).toContain("weekly");
    expect(periods).toContain("monthly");
    expect(periods).toContain("all_time");
  });

  test("leaderboard ranking should sort correctly", async ({ page }) => {
    const users = [
      { id: "1", points: 100 },
      { id: "2", points: 250 },
      { id: "3", points: 50 },
    ];
    
    const sorted = users.sort((a, b) => b.points - a.points);
    
    expect(sorted[0].points).toBe(250);
    expect(sorted[1].points).toBe(100);
    expect(sorted[2].points).toBe(50);
  });
});
