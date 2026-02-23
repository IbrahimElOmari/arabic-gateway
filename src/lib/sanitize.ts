/**
 * XSS sanitization for rich text input.
 */
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}
