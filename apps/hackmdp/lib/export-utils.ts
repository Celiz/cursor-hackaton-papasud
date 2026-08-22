/**
 * Export utilities for tables
 * Supports Excel, PDF, and CSV exports
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  accessorKey: string;
  cell?: (value: unknown) => string;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: unknown[];
  title?: string;
  /** Optional summary row to add at the end */
  summaryRow?: Record<string, string | number>;
}

/**
 * Format currency for Argentina (for export)
 */
export function formatCurrencyExport(amount: number): string {
  if (amount === 0 || isNaN(amount)) return '';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Export data to Excel format
 */
export function exportToExcel(options: ExportOptions): void {
  const { filename, columns, data, summaryRow } = options;

  // Transform data based on columns
  const exportData = data.map(row => {
    const transformedRow: Record<string, unknown> = {};
    columns.forEach(col => {
      const value = getNestedValue(row, col.accessorKey);
      const processedValue = col.cell ? col.cell(value) : value;
      // Replace "-" with empty string for cleaner export
      transformedRow[col.header] = processedValue === '-' ? '' : processedValue;
    });
    return transformedRow;
  });

  // Add empty row and summary row if provided
  if (summaryRow) {
    // Add empty row for spacing
    const emptyRow: Record<string, unknown> = {};
    columns.forEach(col => { emptyRow[col.header] = ''; });
    exportData.push(emptyRow);

    // Add summary row
    const summaryRowData: Record<string, unknown> = {};
    columns.forEach(col => {
      summaryRowData[col.header] = summaryRow[col.header] || summaryRow[col.accessorKey] || '';
    });
    exportData.push(summaryRowData);
  }

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  // Auto-size columns
  const maxWidth = 50;
  const colWidths = columns.map(col => {
    const headerWidth = col.header.length;
    const maxDataWidth = Math.max(
      ...exportData.map(row => String(row[col.header] || '').length)
    );
    return { wch: Math.min(Math.max(headerWidth, maxDataWidth) + 2, maxWidth) };
  });
  ws['!cols'] = colWidths;

  // Generate file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to CSV format
 */
export function exportToCSV(options: ExportOptions): void {
  const { filename, columns, data, summaryRow } = options;

  // Transform data based on columns
  const exportData = data.map(row => {
    const transformedRow: Record<string, unknown> = {};
    columns.forEach(col => {
      const value = getNestedValue(row, col.accessorKey);
      const processedValue = col.cell ? col.cell(value) : value;
      // Replace "-" with empty string for cleaner export
      transformedRow[col.header] = processedValue === '-' ? '' : processedValue;
    });
    return transformedRow;
  });

  // Add empty row and summary row if provided
  if (summaryRow) {
    const emptyRow: Record<string, unknown> = {};
    columns.forEach(col => { emptyRow[col.header] = ''; });
    exportData.push(emptyRow);

    const summaryRowData: Record<string, unknown> = {};
    columns.forEach(col => {
      summaryRowData[col.header] = summaryRow[col.header] || summaryRow[col.accessorKey] || '';
    });
    exportData.push(summaryRowData);
  }

  // Create CSV
  const ws = XLSX.utils.json_to_sheet(exportData);
  const csv = XLSX.utils.sheet_to_csv(ws);

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to PDF format
 */
export function exportToPDF(options: ExportOptions): void {
  const { filename, columns, data, title, summaryRow } = options;

  // Create PDF
  const doc = new jsPDF();

  // Add title if provided
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  // Transform data for PDF table
  const tableData = data.map(row =>
    columns.map(col => {
      const value = getNestedValue(row, col.accessorKey);
      const processedValue = col.cell ? col.cell(value) : String(value || '');
      // Replace "-" with empty string for cleaner export
      return processedValue === '-' ? '' : processedValue;
    })
  );

  // Add summary row if provided
  if (summaryRow) {
    // Add empty row
    tableData.push(columns.map(() => ''));
    // Add summary row
    tableData.push(columns.map(col =>
      String(summaryRow[col.header] || summaryRow[col.accessorKey] || '')
    ));
  }

  // Generate table
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: tableData,
    startY: title ? 25 : 10,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 10 },
    // Style the last row (summary) differently if present
    didParseCell: summaryRow ? (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [230, 230, 250]; // Light purple
      }
    } : undefined,
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Helper function to get nested object values
 * Supports dot notation like "cliente_id.nombre" or "equipo_unidad_id.equipos.marca"
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || !path) return '';
  if (typeof obj !== 'object') return '';

  // Handle dot notation like "cliente_id.nombre"
  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined || typeof value !== 'object') return '';
    // Handle both object properties and nested objects
    value = (value as Record<string, unknown>)[key];
  }

  // If value is still an object, try to get a sensible string representation
  if (value && typeof value === 'object') {
    const objValue = value as Record<string, unknown>;
    // Try common name fields
    return objValue.nombre || objValue.name || objValue.label || String(value);
  }

  return value ?? '';
}
