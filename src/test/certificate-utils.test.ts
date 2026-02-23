import { describe, it, expect } from 'vitest';
import { generateCertificateHtml } from '@/lib/certificate-utils';

describe('generateCertificateHtml', () => {
  it('generates HTML with student name', () => {
    const html = generateCertificateHtml({
      studentName: 'Ahmed Hassan',
      levelName: 'Beginner',
      completionDate: '2026-01-15',
      certificateId: 'cert-123',
      institutionName: 'Huis van het Arabisch',
    });
    expect(html).toContain('Ahmed Hassan');
    expect(html).toContain('Beginner');
    expect(html).toContain('cert-123');
  });

  it('contains required HTML structure', () => {
    const html = generateCertificateHtml({
      studentName: 'Test',
      levelName: 'Advanced',
      completionDate: '2026-02-20',
      certificateId: 'cert-456',
      institutionName: 'Huis van het Arabisch',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });
});
