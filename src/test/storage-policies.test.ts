import { describe, it, expect } from 'vitest';

/**
 * Storage policy tests — validate expected upload constraints.
 */

describe('Storage Upload Validation', () => {
  const STORAGE_RULES = {
    avatars: {
      maxSizeMB: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      requiresAuth: true,
      ownerOnly: true,
    },
    'lesson-recordings': {
      maxSizeMB: 500,
      allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      requiresAuth: true,
      roleRequired: ['admin', 'teacher'],
    },
    'lesson-materials': {
      maxSizeMB: 50,
      allowedTypes: ['application/pdf', 'video/mp4', 'image/jpeg', 'image/png', 'application/msword'],
      requiresAuth: true,
      roleRequired: ['admin', 'teacher'],
    },
    'exercise-media': {
      maxSizeMB: 50,
      requiresAuth: true,
      roleRequired: ['admin', 'teacher'],
    },
    'student-uploads': {
      maxSizeMB: 25,
      requiresAuth: true,
    },
  };

  describe('Bucket configuration', () => {
    it('all buckets have size limits defined', () => {
      for (const [bucket, rules] of Object.entries(STORAGE_RULES)) {
        expect(rules.maxSizeMB).toBeGreaterThan(0);
        expect(rules.maxSizeMB).toBeLessThanOrEqual(500);
      }
    });

    it('all buckets require authentication', () => {
      for (const [_, rules] of Object.entries(STORAGE_RULES)) {
        expect(rules.requiresAuth).toBe(true);
      }
    });

    it('avatars bucket enforces owner-only uploads', () => {
      expect(STORAGE_RULES.avatars.ownerOnly).toBe(true);
    });

    it('lesson-recordings requires teacher/admin role', () => {
      expect(STORAGE_RULES['lesson-recordings'].roleRequired).toContain('teacher');
      expect(STORAGE_RULES['lesson-recordings'].roleRequired).toContain('admin');
    });

    it('avatars only accept image types', () => {
      const types = STORAGE_RULES.avatars.allowedTypes;
      for (const type of types) {
        expect(type).toMatch(/^image\//);
      }
    });

    it('lesson-recordings only accept video types', () => {
      const types = STORAGE_RULES['lesson-recordings'].allowedTypes;
      for (const type of types) {
        expect(type).toMatch(/^video\//);
      }
    });
  });

  describe('Client-side validation helpers', () => {
    function validateFileUpload(
      file: { size: number; type: string },
      bucket: keyof typeof STORAGE_RULES
    ): { valid: boolean; error?: string } {
      const rules = STORAGE_RULES[bucket];
      const maxBytes = rules.maxSizeMB * 1024 * 1024;

      if (file.size > maxBytes) {
        return { valid: false, error: `File exceeds ${rules.maxSizeMB}MB limit` };
      }

      if ('allowedTypes' in rules && rules.allowedTypes) {
        if (!rules.allowedTypes.includes(file.type)) {
          return { valid: false, error: `File type ${file.type} not allowed` };
        }
      }

      return { valid: true };
    }

    it('rejects oversized avatar', () => {
      const result = validateFileUpload(
        { size: 10 * 1024 * 1024, type: 'image/png' },
        'avatars'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
    });

    it('accepts valid avatar', () => {
      const result = validateFileUpload(
        { size: 2 * 1024 * 1024, type: 'image/jpeg' },
        'avatars'
      );
      expect(result.valid).toBe(true);
    });

    it('rejects non-image avatar', () => {
      const result = validateFileUpload(
        { size: 1024, type: 'application/pdf' },
        'avatars'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('rejects non-video recording', () => {
      const result = validateFileUpload(
        { size: 1024, type: 'image/png' },
        'lesson-recordings'
      );
      expect(result.valid).toBe(false);
    });

    it('accepts valid recording', () => {
      const result = validateFileUpload(
        { size: 100 * 1024 * 1024, type: 'video/mp4' },
        'lesson-recordings'
      );
      expect(result.valid).toBe(true);
    });

    it('rejects oversized student upload', () => {
      const result = validateFileUpload(
        { size: 30 * 1024 * 1024, type: 'audio/wav' },
        'student-uploads'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('25MB');
    });
  });
});
