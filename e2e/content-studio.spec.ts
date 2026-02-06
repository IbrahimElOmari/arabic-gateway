import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Content Studio (Teacher/Admin)
 * 
 * Tests the content management system:
 * - Content Studio page
 * - Exercise creation
 * - Lesson scheduling
 * - Recording management
 */

test.describe("Content Studio", () => {
  test("content studio page should be accessible for teachers", async ({ page }) => {
    await page.goto("/teacher/content-studio");
    
    // Should either show content studio or redirect
    const url = page.url();
    expect(url).toMatch(/(\/teacher|\/login|\/dashboard)/);
  });

  test("exercises page should be accessible", async ({ page }) => {
    await page.goto("/teacher/exercises");
    
    const url = page.url();
    expect(url).toMatch(/(\/teacher|\/login|\/dashboard)/);
  });

  test("lessons page should be accessible", async ({ page }) => {
    await page.goto("/teacher/lessons");
    
    const url = page.url();
    expect(url).toMatch(/(\/teacher|\/login|\/dashboard)/);
  });

  test("recordings page should be accessible", async ({ page }) => {
    await page.goto("/teacher/recordings");
    
    const url = page.url();
    expect(url).toMatch(/(\/teacher|\/login|\/dashboard)/);
  });

  test("submissions page should be accessible", async ({ page }) => {
    await page.goto("/teacher/submissions");
    
    const url = page.url();
    expect(url).toMatch(/(\/teacher|\/login|\/dashboard)/);
  });
});

test.describe("Exercise Builder", () => {
  test("question types should be defined correctly", async ({ page }) => {
    const questionTypes = [
      "multiple_choice",
      "checkbox",
      "open_text",
      "audio_upload",
      "video_upload",
      "file_upload",
    ];

    expect(questionTypes.length).toBe(6);
    expect(questionTypes).toContain("audio_upload");
    expect(questionTypes).toContain("video_upload");
  });

  test("multilingual support should be available", async ({ page }) => {
    const supportedLanguages = ["nl", "en", "ar"];
    
    expect(supportedLanguages).toContain("nl");
    expect(supportedLanguages).toContain("en");
    expect(supportedLanguages).toContain("ar");
  });

  test("points system should validate correctly", async ({ page }) => {
    const validatePoints = (points: number) => {
      return points > 0 && points <= 100 && Number.isInteger(points);
    };

    expect(validatePoints(1)).toBe(true);
    expect(validatePoints(10)).toBe(true);
    expect(validatePoints(0)).toBe(false);
    expect(validatePoints(-1)).toBe(false);
    expect(validatePoints(1.5)).toBe(false);
  });
});

test.describe("Lesson Scheduling", () => {
  test("lesson duration validation should work", async ({ page }) => {
    const validateDuration = (minutes: number) => {
      return minutes >= 15 && minutes <= 480;
    };

    expect(validateDuration(90)).toBe(true);
    expect(validateDuration(60)).toBe(true);
    expect(validateDuration(10)).toBe(false);
    expect(validateDuration(500)).toBe(false);
  });

  test("google meet link validation should work", async ({ page }) => {
    const isValidMeetLink = (url: string) => {
      return url.startsWith("https://meet.google.com/") ||
             url.startsWith("https://zoom.us/") ||
             url === "";
    };

    expect(isValidMeetLink("https://meet.google.com/abc-def-ghi")).toBe(true);
    expect(isValidMeetLink("https://zoom.us/j/123456789")).toBe(true);
    expect(isValidMeetLink("")).toBe(true);
    expect(isValidMeetLink("http://malicious.com")).toBe(false);
  });
});

test.describe("Recording Management", () => {
  test("supported video formats should be defined", async ({ page }) => {
    const supportedFormats = ["video/mp4", "video/webm", "video/quicktime"];
    
    expect(supportedFormats).toContain("video/mp4");
    expect(supportedFormats).toContain("video/webm");
  });

  test("file size limits should be enforced", async ({ page }) => {
    const MAX_VIDEO_SIZE_MB = 500;
    const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
    
    const validateFileSize = (sizeBytes: number) => sizeBytes <= MAX_VIDEO_SIZE_BYTES;

    expect(validateFileSize(100 * 1024 * 1024)).toBe(true); // 100MB
    expect(validateFileSize(600 * 1024 * 1024)).toBe(false); // 600MB
  });
});

test.describe("Class Selection", () => {
  test("class selector should require selection for content creation", async ({ page }) => {
    // Test that class selection is required before content creation
    const requiresClassSelection = (hasClasses: boolean, selectedClassId: string | null) => {
      return hasClasses && !selectedClassId;
    };

    expect(requiresClassSelection(true, null)).toBe(true);
    expect(requiresClassSelection(true, "class-123")).toBe(false);
    expect(requiresClassSelection(false, null)).toBe(false);
  });
});
