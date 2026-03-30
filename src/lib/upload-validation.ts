/**
 * Client-side upload validation helpers.
 * Mirrors server-side storage policies for early feedback.
 */

export interface UploadLimits {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  bucketName: string;
}

export const BUCKET_LIMITS: Record<string, UploadLimits> = {
  avatars: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    bucketName: 'avatars',
  },
  'lesson-recordings': {
    maxSizeBytes: 500 * 1024 * 1024, // 500 MB
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav'],
    bucketName: 'lesson-recordings',
  },
  'lesson-materials': {
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4',
      'audio/mpeg',
    ],
    bucketName: 'lesson-materials',
  },
  'student-uploads': {
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: [
      'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/webm', 'video/mp4',
      'application/pdf',
      'image/jpeg', 'image/png',
    ],
    bucketName: 'student-uploads',
  },
  'exercise-media': {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/flac',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
      'application/pdf',
    ],
    bucketName: 'exercise-media',
  },
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file against bucket-specific limits before upload.
 */
export function validateUpload(file: File, bucketName: string): ValidationResult {
  const limits = BUCKET_LIMITS[bucketName];
  if (!limits) {
    return { valid: false, error: `Unknown bucket: ${bucketName}` };
  }

  if (file.size > limits.maxSizeBytes) {
    const maxMB = Math.round(limits.maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum of ${maxMB}MB.`,
    };
  }

  if (!limits.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed: ${limits.allowedMimeTypes.join(', ')}.`,
    };
  }

  return { valid: true };
}

/**
 * Format bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
