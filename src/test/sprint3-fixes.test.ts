import { describe, expect, it } from "vitest";
import { buildStudentUploadPath } from "@/lib/student-upload-path";

describe("Sprint 3 fixes", () => {
  it("builds student upload paths with the user id as first folder", () => {
    const path = buildStudentUploadPath({
      userId: "user-123",
      attemptId: "attempt-456",
      questionId: "question-789",
      prefix: "audio",
      extension: "webm",
      timestamp: 1710000000000,
    });

    expect(path).toBe("user-123/attempt-456/question-789/audio-1710000000000.webm");
    expect(path.split("/")[0]).toBe("user-123");
  });

  it("normalizes file extensions before building upload paths", () => {
    expect(buildStudentUploadPath({
      userId: "student",
      attemptId: "attempt",
      questionId: "question",
      prefix: "file",
      extension: ".pdf",
      timestamp: 1,
    })).toBe("student/attempt/question/file-1.pdf");
  });

  it("stores uploaded media as a private storage path instead of a public URL", () => {
    const path = buildStudentUploadPath({
      userId: "student",
      attemptId: "attempt",
      questionId: "question",
      prefix: "video",
      extension: "webm",
      timestamp: 2,
    });

    expect(path).not.toMatch(/^https?:\/\//);
  });
});