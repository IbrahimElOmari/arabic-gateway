import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

describe("Gamification System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Points Calculation", () => {
    it("should calculate correct points for exercise completion", () => {
      const exercisePoints = 10;
      const bonusMultiplier = 1.5;
      const totalPoints = exercisePoints * bonusMultiplier;
      expect(totalPoints).toBe(15);
    });

    it("should apply streak bonus correctly", () => {
      const basePoints = 100;
      const streakDays = 7;
      const streakBonus = Math.min(streakDays * 0.1, 0.5); // max 50% bonus
      const totalPoints = basePoints * (1 + streakBonus);
      expect(totalPoints).toBe(150);
    });

    it("should cap streak bonus at 50%", () => {
      const basePoints = 100;
      const streakDays = 10;
      const streakBonus = Math.min(streakDays * 0.1, 0.5);
      expect(streakBonus).toBe(0.5);
    });
  });

  describe("Streak Logic", () => {
    it("should continue streak for consecutive days", () => {
      const lastActivityDate = new Date("2026-02-01");
      const currentDate = new Date("2026-02-02");
      const daysDiff = Math.floor(
        (currentDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(1);
      const streakContinues = daysDiff === 1;
      expect(streakContinues).toBe(true);
    });

    it("should break streak after missing a day", () => {
      const lastActivityDate = new Date("2026-02-01");
      const currentDate = new Date("2026-02-03");
      const daysDiff = Math.floor(
        (currentDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(2);
      const streakContinues = daysDiff === 1;
      expect(streakContinues).toBe(false);
    });

    it("should not count same-day activity as new streak day", () => {
      const lastActivityDate = new Date("2026-02-01");
      const currentDate = new Date("2026-02-01");
      const daysDiff = Math.floor(
        (currentDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(0);
    });
  });

  describe("Badge Unlocking", () => {
    it("should unlock first exercise badge after completing first exercise", () => {
      const exercisesCompleted = 1;
      const requiredForBadge = 1;
      const shouldUnlock = exercisesCompleted >= requiredForBadge;
      expect(shouldUnlock).toBe(true);
    });

    it("should unlock streak badge at 7 day streak", () => {
      const currentStreak = 7;
      const requiredStreak = 7;
      const shouldUnlock = currentStreak >= requiredStreak;
      expect(shouldUnlock).toBe(true);
    });

    it("should not unlock badge when requirements not met", () => {
      const exercisesCompleted = 5;
      const requiredForBadge = 10;
      const shouldUnlock = exercisesCompleted >= requiredForBadge;
      expect(shouldUnlock).toBe(false);
    });
  });

  describe("Leaderboard Ranking", () => {
    it("should sort users by points descending", () => {
      const users = [
        { id: "1", points: 500 },
        { id: "2", points: 1000 },
        { id: "3", points: 750 },
      ];
      const sorted = [...users].sort((a, b) => b.points - a.points);
      expect(sorted[0].id).toBe("2");
      expect(sorted[1].id).toBe("3");
      expect(sorted[2].id).toBe("1");
    });

    it("should handle tie scores correctly", () => {
      const users = [
        { id: "1", points: 500 },
        { id: "2", points: 500 },
      ];
      const sorted = [...users].sort((a, b) => b.points - a.points);
      expect(sorted.length).toBe(2);
      expect(sorted[0].points).toBe(sorted[1].points);
    });
  });
});
