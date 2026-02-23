/**
 * Certificate generation placeholder.
 * Generates HTML for a completion certificate.
 */

export interface CertificateData {
  studentName: string;
  levelName: string;
  completionDate: string;
  institutionName: string;
  certificateId: string;
}

/**
 * Generate an HTML string for a certificate of completion.
 * This is a placeholder for future PDF rendering integration.
 */
export function generateCertificateHtml(data: CertificateData): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Certificaat - ${data.studentName}</title>
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
    <div class="student-name">${data.studentName}</div>
    <p>het volgende niveau succesvol heeft afgerond:</p>
    <div class="level">${data.levelName}</div>
    <div class="institution">${data.institutionName}</div>
    <div class="date">Datum: ${data.completionDate}</div>
    <div class="id">Certificaat ID: ${data.certificateId}</div>
  </div>
</body>
</html>`;
}
