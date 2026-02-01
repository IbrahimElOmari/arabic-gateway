// CSV Export Utility
export function exportToCSV(data: Record<string, any>[], filename: string, headers?: Record<string, string>) {
  if (data.length === 0) return;

  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers ? Object.values(headers) : keys;

  const csvContent = [
    headerRow.join(","),
    ...data.map((row) =>
      keys
        .map((key) => {
          const value = row[key];
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma or newline
          if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// PDF Export Utility (using browser print)
export function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

// Generate PDF-ready HTML table
export function generatePDFTable(
  data: Record<string, any>[],
  title: string,
  headers: Record<string, string>
): string {
  const keys = Object.keys(headers);

  return `
    <h1 style="margin-bottom: 20px;">${title}</h1>
    <p style="color: #666; margin-bottom: 20px;">Generated on ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          ${keys.map((key) => `<th>${headers[key]}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) =>
              `<tr>${keys
                .map((key) => `<td>${row[key] ?? ""}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function openPDFPreview(html: string, filename: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 1000px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #3d8c6e; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
          th { background-color: #3d8c6e; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .print-button { 
            position: fixed; 
            top: 20px; 
            right: 20px; 
            padding: 10px 20px; 
            background: #3d8c6e; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
          }
          @media print {
            .print-button { display: none; }
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <button class="print-button" onclick="window.print()">Print / Save PDF</button>
        ${html}
      </body>
    </html>
  `);

  printWindow.document.close();
}
