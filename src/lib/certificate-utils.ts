/**
 * Certificate generation with XSS protection.
 * Generates HTML for a completion certificate.
 */

export interface CertificateData {
  studentName: string;
  levelName: string;
  completionDate: string;
  institutionName: string;
  certificateId: string;
}

/** Escape user-provided strings for safe HTML interpolation. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate an HTML string for a certificate of completion.
 * All user data is HTML-escaped to prevent XSS.
 */
export function generateCertificateHtml(data: CertificateData): string {
  const safe = {
    studentName: escapeHtml(data.studentName),
    levelName: escapeHtml(data.levelName),
    completionDate: escapeHtml(data.completionDate),
    institutionName: escapeHtml(data.institutionName),
    certificateId: escapeHtml(data.certificateId),
  };

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Certificaat - ${safe.studentName}</title>
  <style>
    body { font-family: 'Georgia', serif; text-align: center; padding: 60px; background: #fafaf8; }
    .certificate { border: 3px double #3d8c6e; padding: 60px; max-width: 800px; margin: 0 auto; background: white; }
    .title { font-size: 36px; color: #3d8c6e; margin-bottom: 10px; }
    .subtitle { font-size: 18px; color: #666; margin-bottom: 40px; }
    .student-name { font-size: 28px; font-weight: bold; color: #222; margin: 20px 0; }
    .level { font-size: 20px; color: #3d8c6e; margin: 10px 0; }
    .date { font-size: 14px; color: #888; margin-top: 30px; }
    .id { font-size: 12px; color: #aaa; margin-top: 10px; }
    .institution { font-size: 16px; color: #444; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="title">Certificaat van Voltooiing</div>
    <div class="subtitle">Certificate of Completion</div>
    <p>Hierbij verklaren wij dat</p>
    <div class="student-name">${safe.studentName}</div>
    <p>het volgende niveau succesvol heeft afgerond:</p>
    <div class="level">${safe.levelName}</div>
    <div class="institution">${safe.institutionName}</div>
    <div class="date">Datum: ${safe.completionDate}</div>
    <div class="id">Certificaat ID: ${safe.certificateId}</div>
  </div>
</body>
</html>`;
}
