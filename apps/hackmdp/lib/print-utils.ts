/**
 * Print utilities for detail sheets
 */

export const printDetailSheet = (title: string, content: HTMLElement | null) => {
  if (!content) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes para imprimir');
    return;
  }

  const styles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: system-ui, -apple-system, sans-serif;
        padding: 20mm;
        color: #000;
        background: white;
      }

      h1 {
        font-size: 24pt;
        margin-bottom: 10pt;
        border-bottom: 2pt solid #000;
        padding-bottom: 5pt;
      }

      h2 {
        font-size: 18pt;
        margin-top: 15pt;
        margin-bottom: 8pt;
      }

      h3 {
        font-size: 14pt;
        margin-top: 12pt;
        margin-bottom: 6pt;
      }

      p {
        font-size: 11pt;
        line-height: 1.5;
        margin-bottom: 4pt;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 10pt 0;
      }

      th, td {
        border: 1pt solid #ddd;
        padding: 8pt;
        text-align: left;
        font-size: 10pt;
      }

      th {
        background-color: #f5f5f5;
        font-weight: bold;
      }

      .label {
        font-weight: bold;
        color: #666;
        font-size: 9pt;
        text-transform: uppercase;
        margin-bottom: 2pt;
      }

      .value {
        font-size: 11pt;
        margin-bottom: 8pt;
      }

      .badge {
        display: inline-block;
        padding: 2pt 6pt;
        border-radius: 3pt;
        font-size: 9pt;
        font-weight: bold;
        border: 1pt solid #000;
      }

      .section {
        margin-bottom: 15pt;
        page-break-inside: avoid;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10pt;
      }

      .separator {
        border-top: 1pt solid #ddd;
        margin: 15pt 0;
      }

      /* Print-specific */
      @media print {
        body {
          padding: 0;
        }

        .no-print {
          display: none !important;
        }

        h1 {
          page-break-after: avoid;
        }

        .section {
          page-break-inside: avoid;
        }
      }

      /* Hide elements that shouldn't be printed */
      button, .no-print {
        display: none !important;
      }

      /* Footer */
      .footer {
        margin-top: 30pt;
        padding-top: 10pt;
        border-top: 1pt solid #ddd;
        font-size: 9pt;
        color: #666;
        text-align: center;
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        ${styles}
      </head>
      <body>
        <h1>${title}</h1>
        ${content.innerHTML}
        <div class="footer">
          Impreso el ${new Date().toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/**
 * Download detail sheet as PDF (using browser print to PDF)
 */
export const downloadAsPDF = (title: string, content: HTMLElement | null) => {
  // For now, use print dialog with suggestion to save as PDF
  // In the future, could integrate jsPDF or similar library
  printDetailSheet(title, content);
};

/**
 * Export data to CSV
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Get all unique keys from all objects
  const allKeys = Array.from(
    new Set(data.flatMap(obj => Object.keys(obj)))
  );

  // Create CSV header
  const header = allKeys.join(',');

  // Create CSV rows
  const rows = data.map(obj => {
    return allKeys.map(key => {
      const value = obj[key];

      // Handle different value types
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    }).join(',');
  });

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
