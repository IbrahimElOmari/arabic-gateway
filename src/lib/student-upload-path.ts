export function buildStudentUploadPath({
  userId,
  attemptId,
  questionId,
  prefix,
  extension,
  timestamp = Date.now(),
}: {
  userId: string;
  attemptId: string;
  questionId: string;
  prefix: "audio" | "video" | "file";
  extension: string;
  timestamp?: number;
}) {
  const safeExtension = extension.replace(/^\.+/, "") || "file";
  return `${userId}/${attemptId}/${questionId}/${prefix}-${timestamp}.${safeExtension}`;
}