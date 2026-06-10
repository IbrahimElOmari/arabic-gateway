import { describe, it, expect } from 'vitest';
import { validateMagicBytes, validateUploadStrict } from '@/lib/upload-validation';

function fileFromBytes(bytes: number[], type: string, name = 'f'): File {
  // jsdom's Blob/File stringifies Uint8Array — pass the underlying ArrayBuffer.
  const buf = new Uint8Array(bytes).buffer;
  return new File([buf], name, { type });
}

describe('validateMagicBytes', () => {
  it('accepts a real PNG', async () => {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
    const result = await validateMagicBytes(fileFromBytes(png, 'image/png'));
    expect(result.valid).toBe(true);
  });

  it('rejects an .exe renamed to .png', async () => {
    const exe = [0x4d, 0x5a, 0x90, 0x00]; // PE header
    const result = await validateMagicBytes(fileFromBytes(exe, 'image/png', 'evil.png'));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/signature/i);
  });

  it('accepts a real JPEG', async () => {
    const jpg = [0xff, 0xd8, 0xff, 0xe0];
    expect((await validateMagicBytes(fileFromBytes(jpg, 'image/jpeg'))).valid).toBe(true);
  });

  it('accepts a real PDF', async () => {
    const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d];
    expect((await validateMagicBytes(fileFromBytes(pdf, 'application/pdf'))).valid).toBe(true);
  });

  it('accepts a real WebP (RIFF + WEBP)', async () => {
    const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
    expect((await validateMagicBytes(fileFromBytes(webp, 'image/webp'))).valid).toBe(true);
  });

  it('passes unknown MIME types through (no false positives)', async () => {
    const txt = [0x48, 0x69];
    expect((await validateMagicBytes(fileFromBytes(txt, 'text/plain'))).valid).toBe(true);
  });

  it('validateUploadStrict short-circuits on bad MIME before reading bytes', async () => {
    const file = fileFromBytes([0xff, 0xd8, 0xff], 'image/jpeg');
    Object.defineProperty(file, 'size', { value: 999 * 1024 * 1024 });
    const result = await validateUploadStrict(file, 'avatars');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceeds maximum/);
  });
});
