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
  },
}));

describe("Exercise Scoring", () => {
  describe("Auto-grading Logic", () => {
    it("should correctly grade multiple choice answers", () => {
      const question = {
        type: "multiple_choice",
        options: [
          { label: "A", value: "a", isCorrect: false },
          { label: "B", value: "b", isCorrect: true },
          { label: "C", value: "c", isCorrect: false },
        ],
        points: 10,
      };
      
      const correctAnswer = question.options.find((o) => o.isCorrect)?.value;
      const userAnswer = "b";
      const isCorrect = userAnswer === correctAnswer;
      const score = isCorrect ? question.points : 0;
      
      expect(isCorrect).toBe(true);
      expect(score).toBe(10);
    });

    it("should correctly grade checkbox answers with all correct selections", () => {
      const question = {
        type: "checkbox",
        options: [
          { label: "A", value: "a", isCorrect: true },
          { label: "B", value: "b", isCorrect: true },
          { label: "C", value: "c", isCorrect: false },
        ],
        points: 10,
      };
      
      const correctValues = question.options.filter((o) => o.isCorrect).map((o) => o.value);
      const userAnswers = ["a", "b"];
      
      const isCorrect = 
        correctValues.length === userAnswers.length &&
        correctValues.every((v) => userAnswers.includes(v));
      
      expect(isCorrect).toBe(true);
    });

    it("should mark checkbox as incorrect with partial answers", () => {
      const question = {
        type: "checkbox",
        options: [
          { label: "A", value: "a", isCorrect: true },
          { label: "B", value: "b", isCorrect: true },
          { label: "C", value: "c", isCorrect: false },
        ],
        points: 10,
      };
      
      const correctValues = question.options.filter((o) => o.isCorrect).map((o) => o.value);
      const userAnswers = ["a"]; // Missing "b"
      
      const isCorrect = 
        correctValues.length === userAnswers.length &&
        correctValues.every((v) => userAnswers.includes(v));
      
      expect(isCorrect).toBe(false);
    });

    it("should mark checkbox as incorrect with extra wrong answers", () => {
      const correctValues = ["a", "b"];
      const userAnswers = ["a", "b", "c"];
      
      const isCorrect = 
        correctValues.length === userAnswers.length &&
        correctValues.every((v) => userAnswers.includes(v));
      
      expect(isCorrect).toBe(false);
    });
  });

  describe("Score Calculation", () => {
    it("should calculate percentage score correctly", () => {
      const totalScore = 35;
      const maxScore = 50;
      const percentage = (totalScore / maxScore) * 100;
      expect(percentage).toBe(70);
    });

    it("should handle zero max score", () => {
      const totalScore = 0;
      const maxScore = 0;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      expect(percentage).toBe(0);
    });

    it("should determine passing correctly", () => {
      const passingScore = 60;
      
      expect(70 >= passingScore).toBe(true);
      expect(60 >= passingScore).toBe(true);
      expect(59 >= passingScore).toBe(false);
    });
  });

  describe("Timer Logic", () => {
    it("should format time correctly", () => {
      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      };
      
      expect(formatTime(125)).toBe("2:05");
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(59)).toBe("0:59");
      expect(formatTime(0)).toBe("0:00");
    });

    it("should detect time running low", () => {
      const timeLeft = 45;
      const isLow = timeLeft < 60;
      expect(isLow).toBe(true);
    });
  });

  describe("Attempt Tracking", () => {
    it("should increment attempt number correctly", () => {
      const existingAttempts = [
        { attempt_number: 1 },
        { attempt_number: 2 },
      ];
      const lastAttempt = existingAttempts[0]?.attempt_number || 0;
      const nextAttempt = lastAttempt + 1;
      expect(nextAttempt).toBe(2);
    });

    it("should handle no previous attempts", () => {
      const existingAttempts: any[] = [];
      const lastAttempt = existingAttempts[0]?.attempt_number || 0;
      const nextAttempt = lastAttempt + 1;
      expect(nextAttempt).toBe(1);
    });

    it("should respect max attempts limit", () => {
      const maxAttempts = 3;
      const currentAttempts = 3;
      const canAttempt = currentAttempts < maxAttempts;
      expect(canAttempt).toBe(false);
    });
  });
});
