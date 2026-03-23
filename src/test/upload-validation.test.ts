import { describe, it, expect } from 'vitest';
import { validateUpload, formatFileSize, BUCKET_LIMITS } from '@/lib/upload-validation';

describe('Upload Validation', () => {
  describe('validateUpload', () => {
    it('accepts valid avatar upload', () => {
      const file = new File(['x'.repeat(1024)], 'avatar.jpg', { type: 'image/jpeg' });
      const result = validateUpload(file, 'avatars');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects oversized avatar', () => {
      const file = new File(['x'.repeat(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
      const result = validateUpload(file, 'avatars');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('rejects invalid MIME type for avatars', () => {
      const file = new File(['data'], 'file.pdf', { type: 'application/pdf' });
      const result = validateUpload(file, 'avatars');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('accepts valid lesson recording', () => {
      const file = new File(['data'], 'lesson.mp4', { type: 'video/mp4' });
      const result = validateUpload(file, 'lesson-recordings');
      expect(result.valid).toBe(true);
    });

    it('rejects unknown bucket', () => {
      const file = new File(['data'], 'file.txt', { type: 'text/plain' });
      const result = validateUpload(file, 'unknown-bucket');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown bucket');
    });

    it('accepts valid student upload', () => {
      const file = new File(['data'], 'recording.webm', { type: 'audio/webm' });
      const result = validateUpload(file, 'student-uploads');
      expect(result.valid).toBe(true);
    });

    it('rejects executable in exercise-media', () => {
      const file = new File(['data'], 'malware.exe', { type: 'application/x-msdownload' });
      const result = validateUpload(file, 'exercise-media');
      expect(result.valid).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
  });

  describe('BUCKET_LIMITS', () => {
    it('defines limits for all expected buckets', () => {
      expect(BUCKET_LIMITS).toHaveProperty('avatars');
      expect(BUCKET_LIMITS).toHaveProperty('lesson-recordings');
      expect(BUCKET_LIMITS).toHaveProperty('lesson-materials');
      expect(BUCKET_LIMITS).toHaveProperty('student-uploads');
      expect(BUCKET_LIMITS).toHaveProperty('exercise-media');
    });

    it('avatars max size is 5MB', () => {
      expect(BUCKET_LIMITS.avatars.maxSizeBytes).toBe(5 * 1024 * 1024);
    });

    it('lesson-recordings max size is 500MB', () => {
      expect(BUCKET_LIMITS['lesson-recordings'].maxSizeBytes).toBe(500 * 1024 * 1024);
    });
  });
});
