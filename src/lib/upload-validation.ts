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
 * Magic-byte (file signature) table. Defends against attackers that rename a
 * payload to bypass MIME-type checks (e.g. `evil.exe` → `evil.png`).
 *
 * Each entry is a list of (offset, bytes) tuples that ALL must match.
 */
const FILE_SIGNATURES: Record<string, Array<{ offset: number; bytes: number[] }>> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png':  [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/gif':  [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
  'image/bmp':  [{ offset: 0, bytes: [0x42, 0x4d] }],
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
  'video/mp4': [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  'video/webm': [{ offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  'audio/mpeg': [{ offset: 0, bytes: [0x49, 0x44, 0x33] }], // ID3
  'audio/wav':  [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }],
  'audio/ogg':  [{ offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }],
};

/**
 * Pure signature check — exported for testability. Pass the leading bytes
 * of the file and the claimed MIME type.
 */
export function matchesSignature(bytes: Uint8Array, mimeType: string): ValidationResult {
  const sigs = FILE_SIGNATURES[mimeType];
  if (!sigs) return { valid: true };
  for (const sig of sigs) {
    for (let i = 0; i < sig.bytes.length; i++) {
      if (bytes[sig.offset + i] !== sig.bytes[i]) {
        return {
          valid: false,
          error: `File signature does not match declared type "${mimeType}". The file may be corrupted or misrepresented.`,
        };
      }
    }
  }
  return { valid: true };
}

/**
 * Verify that the first bytes of a file match the claimed MIME type.
 * Returns `{ valid: true }` for MIME types we don't have a signature for
 * (e.g. SVG, plain text, office formats) so we don't reject legitimate uploads.
 */
export async function validateMagicBytes(file: File): Promise<ValidationResult> {
  const sigs = FILE_SIGNATURES[file.type];
  if (!sigs) return { valid: true };
  const maxOffset = sigs.reduce((m, s) => Math.max(m, s.offset + s.bytes.length), 0);
  const ab = typeof file.arrayBuffer === 'function'
    ? await file.arrayBuffer()
    : await new Response(file).arrayBuffer();
  const buf = new Uint8Array(ab).subarray(0, maxOffset);
  return matchesSignature(buf, file.type);
}

/**
 * Full validation: MIME-type + size + magic-byte signature.
 */
export async function validateUploadStrict(file: File, bucketName: string): Promise<ValidationResult> {
  const mimeResult = validateUpload(file, bucketName);
  if (!mimeResult.valid) return mimeResult;
  return validateMagicBytes(file);
}

/**
 * Format bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
