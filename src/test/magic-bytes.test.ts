import { describe, it, expect } from 'vitest';
import { matchesSignature, validateUploadStrict } from '@/lib/upload-validation';

describe('matchesSignature', () => {
  it('accepts a real PNG', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(matchesSignature(png, 'image/png').valid).toBe(true);
  });

  it('rejects an .exe renamed to .png', () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const r = matchesSignature(exe, 'image/png');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/signature/i);
  });

  it('accepts a real JPEG', () => {
    expect(matchesSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg').valid).toBe(true);
  });

  it('accepts a real PDF', () => {
    expect(matchesSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'application/pdf').valid).toBe(true);
  });

  it('accepts a real WebP (RIFF + WEBP)', () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(matchesSignature(webp, 'image/webp').valid).toBe(true);
  });

  it('rejects RIFF claiming WebP but missing WEBP marker', () => {
    const fake = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20]);
    expect(matchesSignature(fake, 'image/webp').valid).toBe(false);
  });

  it('passes unknown MIME types through (no false positives)', () => {
    expect(matchesSignature(new Uint8Array([0x48, 0x69]), 'text/plain').valid).toBe(true);
  });

  it('validateUploadStrict short-circuits on bad size before reading bytes', async () => {
    const file = new File([new Uint8Array(0).buffer], 'a.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 999 * 1024 * 1024 });
    const r = await validateUploadStrict(file, 'avatars');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/exceeds maximum/);
  });
});
