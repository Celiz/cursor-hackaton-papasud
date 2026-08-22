import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  loadPdfTheme,
  drawHeader,
  drawFooter,
  drawSectionTitle,
  PDF_COLORS,
  type PdfThemeConfig,
  type FooterFirma,
} from './pdf-theme';

interface PresupuestoItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  precio_costo?: number;
  imagen_url?: string;
  moneda_original?: string;
}

interface PresupuestoCliente {
  nombre: string;
  nombre_fantasia?: string;
  cuit?: string;
  email?: string[];
  telefono?: string[];
  direccion?: string;
}

interface UsuarioFirma {
  nombre_completo?: string;
  cargo?: string;
  email?: string;
  telefono_directo?: string;
  firma_activa?: boolean;
}

interface PresupuestoData {
  numero: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  validez_dias?: number;
  condiciones_pago?: string;
  notas?: string;
  subtotal: number;
  total: number;
  moneda?: string;
  cotizacion_usd?: number;
  mostrar_en_usd?: boolean;
  tipo_cotizacion?: string;
  clientes?: PresupuestoCliente;
  presupuestos_items?: PresupuestoItem[];
  lineas?: PresupuestoItem[];
  lista_precios_nombre?: string;
  usuario?: UsuarioFirma;
}

function formatCurrency(amount: number, currency: string = 'ARS'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getCondicionesPagoText(condiciones?: string): string {
  const map: Record<string, string> = {
    contado: 'Contado',
    '15_dias': '15 días',
    '30_dias': '30 días',
    '60_dias': '60 días',
    '50_50': '50% anticipo, 50% contra entrega',
    personalizado: 'Personalizado',
  };
  return condiciones ? map[condiciones] || condiciones : '-';
}

export async function generatePresupuestoPDF(presupuesto: PresupuestoData, orgId: string): Promise<jsPDF> {
  const theme = await loadPdfTheme(orgId);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // =====================
  // HEADER
  // =====================
  let y = drawHeader(doc, theme, undefined, { logoRight: true });

  // =====================
  // TÍTULO PRESUPUESTO (sin caja, pura tipografía)
  // =====================
  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Presupuesto', margin, y + 4);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${presupuesto.numero}`, margin, y + 13);

  // Fechas a la derecha
  const rightX = pageWidth - margin;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text('Fecha de emisión', rightX, y + 4, { align: 'right' });
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(presupuesto.fecha_emision), rightX, y + 9, { align: 'right' });

  if (presupuesto.fecha_vencimiento) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text('Válido hasta', rightX, y + 14, { align: 'right' });
    doc.setTextColor(...PDF_COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(presupuesto.fecha_vencimiento), rightX, y + 19, { align: 'right' });
  }

  y += 25;

  // =====================
  // CLIENTE
  // =====================
  drawSectionTitle(doc, theme, y, 'Cliente');
  y += 7;

  const clienteNombre =
    presupuesto.clientes?.nombre_fantasia || presupuesto.clientes?.nombre || 'Sin cliente';
  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(clienteNombre, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);

  const clienteInfo: string[] = [];
  if (presupuesto.clientes?.cuit) clienteInfo.push(`CUIT ${presupuesto.clientes.cuit}`);
  if (presupuesto.clientes?.direccion) clienteInfo.push(presupuesto.clientes.direccion);
  if (clienteInfo.length) {
    doc.text(clienteInfo.join('  ·  '), margin, y + 5);
  }

  // Contacto a la derecha
  let contactY = y;
  if (presupuesto.clientes?.email?.length) {
    doc.text(presupuesto.clientes.email[0], rightX, contactY, { align: 'right' });
    contactY += 5;
  }
  if (presupuesto.clientes?.telefono?.length) {
    doc.text(presupuesto.clientes.telefono[0], rightX, contactY, { align: 'right' });
  }

  y += 14;

  // =====================
  // DETALLE
  // =====================
  drawSectionTitle(doc, theme, y, 'Detalle');
  y += 5;

  const items = presupuesto.presupuestos_items || presupuesto.lineas || [];
  const tableBody = items.map((item) => [
    item.descripcion || '-',
    item.cantidad.toString(),
    formatCurrency(item.precio_unitario, 'ARS'),
    formatCurrency(item.subtotal, 'ARS'),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Descripción', 'Cant.', 'Precio unitario', 'Subtotal']],
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
      textColor: PDF_COLORS.text,
      lineColor: PDF_COLORS.rule,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: PDF_COLORS.muted,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 2, right: 3, bottom: 3, left: 3 },
      lineColor: PDF_COLORS.rule,
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      // Solo rayas horizontales: bottom en header y en body rows.
      data.cell.styles.lineWidth = 0;
    },
    didDrawCell: (data) => {
      const { doc: d, cell, row, section } = data;
      d.setDrawColor(...PDF_COLORS.rule);
      d.setLineWidth(0.2);
      if (section === 'head') {
        // línea superior e inferior gruesas alrededor del head
        d.setLineWidth(0.4);
        d.setDrawColor(...theme.branding.primaryColor);
        d.line(cell.x, cell.y, cell.x + cell.width, cell.y);
        d.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
      } else if (section === 'body') {
        d.setLineWidth(0.15);
        d.setDrawColor(...PDF_COLORS.rule);
        // Línea sutil entre filas
        if (row.index < (tableBody.length - 1)) {
          d.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // =====================
  // TOTALES (alineados derecha, sin caja)
  // =====================
  const labelX = pageWidth - margin - 55;
  const valueX = pageWidth - margin;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text('Subtotal', labelX, y, { align: 'left' });
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(formatCurrency(presupuesto.subtotal), valueX, y, { align: 'right' });

  y += 5;

  // Filete fino accent arriba del total
  doc.setDrawColor(...theme.branding.primaryColor);
  doc.setLineWidth(0.4);
  doc.line(labelX, y, valueX, y);

  y += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.branding.primaryColor);
  doc.text('TOTAL', labelX, y, { align: 'left' });
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(formatCurrency(presupuesto.total), valueX, y, { align: 'right' });

  // cotizacion_usd/total pueden venir como string (numeric de Postgres): coercionar.
  const cotUsd = Number(presupuesto.cotizacion_usd) || 0;
  if (cotUsd > 0) {
    const totalUsd = Number(presupuesto.total) / cotUsd;
    const tipoCot = presupuesto.tipo_cotizacion || 'oficial';
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(
      `Equivalente a ${formatCurrency(totalUsd, 'USD')}  ·  USD ${tipoCot} $${cotUsd.toFixed(2)}`,
      valueX,
      y,
      { align: 'right' }
    );
  }

  y += 15;

  // =====================
  // CONDICIONES
  // =====================
  if (presupuesto.condiciones_pago || presupuesto.validez_dias || presupuesto.notas) {
    drawSectionTitle(doc, theme, y, 'Condiciones');
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);

    if (presupuesto.condiciones_pago) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text('Forma de pago', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(getCondicionesPagoText(presupuesto.condiciones_pago), margin + 35, y);
      y += 5;
    }

    if (presupuesto.validez_dias) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text('Validez', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(`${presupuesto.validez_dias} días`, margin + 35, y);
      y += 5;
    }

    if (presupuesto.notas) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text('Notas', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      const notasLines = doc.splitTextToSize(presupuesto.notas, pageWidth - margin * 2);
      doc.text(notasLines, margin, y);
    }
  }

  // =====================
  // FOOTER CON FIRMA
  // =====================
  const firma: FooterFirma | undefined = presupuesto.usuario?.firma_activa
    ? {
        nombre_completo: presupuesto.usuario.nombre_completo!,
        cargo: presupuesto.usuario.cargo,
        email: presupuesto.usuario.email,
        telefono_directo: presupuesto.usuario.telefono_directo,
      }
    : undefined;

  drawFooter(doc, theme, firma);

  return doc;
}

export async function downloadPresupuestoPDF(presupuesto: PresupuestoData, orgId: string): Promise<void> {
  const doc = await generatePresupuestoPDF(presupuesto, orgId);
  doc.save(`Presupuesto_${presupuesto.numero}.pdf`);
}

export async function getPresupuestoPDFBase64(presupuesto: PresupuestoData, orgId: string): Promise<string> {
  const doc = await generatePresupuestoPDF(presupuesto, orgId);
  return doc.output('datauristring').split(',')[1];
}

export async function getPresupuestoPDFBlob(presupuesto: PresupuestoData, orgId: string): Promise<Blob> {
  const doc = await generatePresupuestoPDF(presupuesto, orgId);
  return doc.output('blob');
}
