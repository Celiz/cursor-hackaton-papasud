import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { query } from '@/lib/db';
import { loadPdfTheme, drawFooter, PDF_COLORS, type PdfThemeConfig } from '@/lib/pdf-theme';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

const formatDate = (dateString: string | Date) => {
  try {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
};

const METODOS_PAGO: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia Bancaria',
  mercadopago: 'Mercado Pago',
  cheque: 'Cheque',
  debito: 'Tarjeta de Débito',
  credito: 'Tarjeta de Crédito',
};

export interface CobroIvrPdfData {
  cobro: any;
  aplicaciones: any[];
  pdfBuffer: Buffer;
  pdfBase64: string;
  fileName: string;
}

export async function loadCobroIvrForPdf(cobroId: string, orgId: string) {
  const result = await query(
    `SELECT
      co.id,
      co.factura_id as ivr_id,
      co.monto,
      co.fecha_pago,
      co.metodo_pago,
      co.notas,
      co.nro_pago,
      co.referencia_pago,
      co.created_at,
      f.nro_factura as ivr_numero,
      f.total as ivr_total,
      f.saldo_pendiente as ivr_saldo_pendiente,
      f.fecha_emision as ivr_fecha,
      COALESCE(c.id, co.cliente_id) as cliente_id,
      COALESCE(c.nombre, cl2.nombre) as cliente_nombre,
      COALESCE(c.nombre_fantasia, cl2.nombre_fantasia) as cliente_nombre_fantasia,
      COALESCE(c.identificador_unico, cl2.identificador_unico) as cliente_id_unico,
      COALESCE(c.cuit, cl2.cuit) as cliente_cuit,
      COALESCE(c.direccion, cl2.direccion) as cliente_direccion,
      COALESCE(c.email, cl2.email) as cliente_email,
      cb.nombre as cuenta_nombre,
      cb.banco as cuenta_banco
    FROM cobros co
    LEFT JOIN facturas f ON co.factura_id = f.id
    LEFT JOIN clientes c ON f.cliente_id = c.id
    LEFT JOIN clientes cl2 ON co.cliente_id = cl2.id
    LEFT JOIN cuentas_bancarias cb ON co.cuenta_bancaria_id = cb.id
    WHERE co.id = $1 AND co.org_id = $2`,
    [cobroId, orgId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const cobro = result.rows[0];

  const aplicacionesResult = await query(
    `SELECT
      ca.monto_aplicado,
      f.id as factura_id,
      f.nro_factura,
      f.tipo_factura,
      f.total as factura_total,
      f.saldo_pendiente
    FROM cobros_aplicaciones ca
    JOIN facturas f ON ca.factura_id = f.id
    WHERE ca.cobro_id = $1
    ORDER BY f.nro_factura`,
    [cobroId]
  );

  return { cobro, aplicaciones: aplicacionesResult.rows };
}

export function buildCobroIvrPdf(
  cobro: any,
  aplicaciones: any[],
  theme: PdfThemeConfig
): { buffer: Buffer; fileName: string } {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor = theme.branding.primaryColor;
  const textColor = PDF_COLORS.ink;
  const mutedColor = PDF_COLORS.muted;
  const lightBg: [number, number, number] = [249, 250, 251];
  const borderColor = PDF_COLORS.rule;

  const col1X = margin;
  const cobroNumero = cobro.nro_pago || cobro.id.slice(0, 8).toUpperCase();

  let y = 12;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }
  };

  const sectionTitle = (title: string) => {
    checkPageBreak(20);
    doc.setFillColor(...lightBg);
    doc.rect(margin, y - 4, contentWidth, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(title, margin + 3, y + 3);
    y += 12;
  };

  // =====================
  // HEADER: logo + datos a la izquierda, caja del documento a la derecha
  // =====================
  const logoBase64 = theme.branding.logoBase64;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, y, 28, 28);
    } catch {
      /* continue */
    }
  }

  const infoX = logoBase64 ? margin + 33 : margin;
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(theme.branding.nombre, infoX, y + 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text(theme.branding.direccion || '', infoX, y + 14);
  doc.text(
    `Tel: ${theme.branding.telefono || ''} | CUIT: ${theme.branding.cuit || ''}`,
    infoX,
    y + 19
  );
  doc.setTextColor(...primaryColor);
  doc.text(theme.branding.email || '', infoX, y + 24);

  // Caja del documento a la derecha
  const docBoxW = 60;
  const docBoxX = pageWidth - margin - docBoxW;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(docBoxX, y, docBoxW, 22, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RECIBO DE COBRO', docBoxX + docBoxW / 2, y + 8, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${cobroNumero}`, docBoxX + docBoxW / 2, y + 17, { align: 'center' });

  y += 35;

  // Línea separadora + fila de fechas/método
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const inlineField = (label: string, value: string, x: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(label, x, y);
    const lw = doc.getTextWidth(label);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(value, x + lw + 2, y);
  };
  inlineField('Fecha: ', formatDate(cobro.fecha_pago), margin);
  inlineField(
    'Método: ',
    METODOS_PAGO[cobro.metodo_pago] || cobro.metodo_pago || '-',
    margin + 60
  );
  if (cobro.cuenta_banco) {
    inlineField('Cuenta: ', cobro.cuenta_banco, margin + 125);
  }

  y += 12;

  // =====================
  // CLIENTE
  // =====================
  sectionTitle('CLIENTE');

  // Razón social (cliente.nombre) como nombre principal del recibo; el nombre
  // de fantasía va como línea secundaria de contexto.
  const clienteNombre = cobro.cliente_nombre || cobro.cliente_nombre_fantasia || 'No especificado';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(String(clienteNombre).toUpperCase(), col1X, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  if (cobro.cliente_nombre_fantasia && cobro.cliente_nombre) {
    doc.text(cobro.cliente_nombre_fantasia, col1X, y);
    y += 4;
  }
  if (cobro.cliente_cuit) {
    doc.text(`CUIT: ${cobro.cliente_cuit}`, col1X, y);
    y += 4;
  }
  if (cobro.cliente_id_unico) {
    doc.text(`ID: ${cobro.cliente_id_unico}`, col1X, y);
    y += 4;
  }
  y += 6;

  // =====================
  // MONTO COBRADO (cuadro destacado)
  // =====================
  checkPageBreak(20);
  const montoBoxH = 16;
  doc.setFillColor(...lightBg);
  doc.rect(margin, y, contentWidth, montoBoxH, 'F');
  doc.setDrawColor(...borderColor);
  doc.rect(margin, y, contentWidth, montoBoxH, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('Monto Cobrado', margin + 4, y + 6);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(Number(cobro.monto)), pageWidth - margin - 4, y + 11, { align: 'right' });

  y += montoBoxH + 8;

  // =====================
  // COMPROBANTES (aplicaciones o IVR linkeado)
  // =====================
  if (aplicaciones.length > 0) {
    sectionTitle('COMPROBANTES APLICADOS');

    const facturasData = aplicaciones.map((app: any) => [
      `${app.tipo_factura === 'IVR' ? 'IVR' : app.tipo_factura} ${app.nro_factura}`,
      formatCurrency(Number(app.factura_total)),
      formatCurrency(Number(app.monto_aplicado)),
      formatCurrency(Number(app.saldo_pendiente || 0)),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Comprobante', 'Total', 'Importe Pagado', 'Saldo']],
      body: facturasData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: lightBg },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;

    const totalAplicado = aplicaciones.reduce(
      (sum: number, app: any) => sum + parseFloat(app.monto_aplicado),
      0
    );
    const saldoSinAplicar = Number(cobro.monto) - totalAplicado;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(`Total Aplicado: ${formatCurrency(totalAplicado)}`, pageWidth - margin, y, {
      align: 'right',
    });

    if (saldoSinAplicar > 0.01) {
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...mutedColor);
      doc.text(`Saldo a Favor: ${formatCurrency(saldoSinAplicar)}`, pageWidth - margin, y, {
        align: 'right',
      });
    }

    y += 10;
  } else if (cobro.ivr_numero) {
    sectionTitle('COMPROBANTE APLICADO');

    const detalles = [
      ['IVR Número', cobro.ivr_numero || '-'],
      ['Total del IVR', formatCurrency(Number(cobro.ivr_total || 0))],
      ['Monto Cobrado', formatCurrency(Number(cobro.monto))],
      ['Saldo Pendiente', formatCurrency(Number(cobro.ivr_saldo_pendiente || 0))],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: detalles,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, textColor: textColor },
        1: { cellWidth: 'auto', textColor: mutedColor },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    sectionTitle('DETALLE');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text('Cobro a cuenta (sin comprobantes asociados).', margin, y);
    y += 10;
  }

  // =====================
  // REFERENCIA / NOTAS
  // =====================
  if (cobro.referencia_pago) {
    checkPageBreak(10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(`Referencia: ${cobro.referencia_pago}`, margin, y);
    y += 8;
  }

  if (cobro.notas) {
    const notasStr = String(cobro.notas).trim();
    if (notasStr) {
      sectionTitle('NOTAS');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...mutedColor);
      const notasLines = doc.splitTextToSize(notasStr, contentWidth);
      checkPageBreak(notasLines.length * 4 + 6);
      doc.text(notasLines, margin, y);
      y += notasLines.length * 4 + 8;
    }
  }

  // Aviso documento (recibo interno)
  checkPageBreak(12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...mutedColor);
  doc.text('* Recibo de cobro generado para uso interno y comunicación con el cliente.', margin, y);

  drawFooter(doc, theme);

  const buffer = Buffer.from(doc.output('arraybuffer'));
  const fileName = `Recibo_${cobroNumero}_${cobro.ivr_numero || 'cobro'}_${new Date(cobro.fecha_pago).toISOString().split('T')[0]}.pdf`;

  return { buffer, fileName };
}

export async function generateCobroIvrPdf(
  cobroId: string,
  orgId: string
): Promise<CobroIvrPdfData | null> {
  const data = await loadCobroIvrForPdf(cobroId, orgId);
  if (!data) return null;

  const theme = await loadPdfTheme(orgId);
  const { cobro, aplicaciones } = data;
  const { buffer, fileName } = buildCobroIvrPdf(cobro, aplicaciones, theme);

  return {
    cobro,
    aplicaciones,
    pdfBuffer: buffer,
    pdfBase64: buffer.toString('base64'),
    fileName,
  };
}
