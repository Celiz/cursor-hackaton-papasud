import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Servicio,
  ServicioConFactura,
  Factura,
  CuentaCorriente,
  MovimientoCuentaCorriente,
  EquipoServicioTecnico,
  CuentaCorrienteIvr,
  MovimientoIvr,
  CuentaCorrienteProveedor,
  MovimientoProveedor,
} from './types';
import { loadPdfTheme, drawHeader, drawFooter, PDF_COLORS } from './pdf-theme';

// Colores de estado reutilizados (no dependen de org)
const STATUS_COLORS = {
  success: [34, 197, 94] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  error: [239, 68, 68] as [number, number, number],
};

/**
 * Formatea moneda
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}

// Helper top-level: coerciona cualquier cosa a string seguro para doc.text / splitTextToSize
function safeText(v: any): string | string[] {
  if (v == null) return '-';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    // Si viene array de strings (resultado de splitTextToSize), dejarlo pasar
    if (v.every((x) => typeof x === 'string')) return v as string[];
    return v.filter(Boolean).map((x) => (typeof x === 'string' ? x : safeText(x) as string)).join(', ');
  }
  if (typeof v === 'object') {
    return String((v as any).nombre || (v as any).label || (v as any).numero || (v as any).text || JSON.stringify(v));
  }
  return String(v);
}

// Envuelve una instancia de jsPDF para que toda llamada a .text() coercione
function wrapTextSafe(doc: jsPDF): jsPDF {
  const origText = doc.text.bind(doc);
  (doc as any).text = function (...args: any[]) {
    if (args.length > 0) args[0] = safeText(args[0]);
    return origText(...(args as [any, any, any]));
  };
  const origSplit = doc.splitTextToSize.bind(doc);
  (doc as any).splitTextToSize = function (text: any, ...rest: any[]) {
    return origSplit(safeText(text) as any, ...(rest as [any]));
  };
  return doc;
}

export async function generateServicioPDF(servicio: Servicio, orgId: string) {
  const theme = await loadPdfTheme(orgId);
  const doc = wrapTextSafe(new jsPDF());
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const centerX = pageWidth / 2;

  const primaryColor = theme.branding.primaryColor;
  const textColor = PDF_COLORS.ink;
  const mutedColor = PDF_COLORS.muted;
  const lightBg: [number, number, number] = [249, 250, 251];
  const borderColor = PDF_COLORS.rule;

  const colWidth = (contentWidth - 10) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + 10;

  // Número de orden formateado
  const nroOrden = (servicio as any).nro_orden
    ? String((servicio as any).nro_orden).padStart(5, '0')
    : servicio.id?.slice(0, 8).toUpperCase() || '-';

  // Helper: check if we need a new page
  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }
  };

  // Helper: section title
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

  // Helper: coerce any value to a safe display string
  const asText = (v: any): string => {
    if (v == null) return '-';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.filter(Boolean).map(asText).join(', ');
    if (typeof v === 'object') {
      // Prefer common display fields
      return (v.nombre || v.label || v.numero || v.text || JSON.stringify(v));
    }
    return String(v);
  };

  // Helper: label + value row
  const labelValue = (label: string, value: any, x: number, maxWidth?: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(label, x, y);
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    const safe = asText(value);
    const lines = doc.splitTextToSize(safe || '-', maxWidth || colWidth - 5);
    doc.text(lines, x, y + 4);
    return lines.length * 4 + 6;
  };

  // =====================
  // HEADER
  // =====================
  let y = 12;

  const logoBase64 = theme.branding.logoBase64;
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', margin, y, 28, 28); } catch { /* continue without logo */ }
  }

  // Company info al lado del logo
  const infoX = logoBase64 ? margin + 33 : margin;
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(theme.branding.nombre, infoX, y + 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text(theme.branding.direccion || '', infoX, y + 14);
  doc.text(`Tel: ${theme.branding.telefono || ''} | CUIT: ${theme.branding.cuit || ''}`, infoX, y + 19);
  doc.setTextColor(...primaryColor);
  doc.text(theme.branding.email || '', infoX, y + 24);

  // Orden box a la derecha
  const boxW = 55;
  const boxX = pageWidth - margin - boxW;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(boxX, y, boxW, 22, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ORDEN DE SERVICIO', boxX + boxW / 2, y + 8, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${nroOrden}`, boxX + boxW / 2, y + 17, { align: 'center' });

  y += 35;

  // Fechas debajo del header
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const formatDate = (d: string | undefined) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text(`Ingreso: `, margin, y);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(servicio.fecha), margin + 18, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text(`Entrega: `, margin + 55, y);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(servicio.fecha_fin), margin + 55 + 18, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text(`Estado: `, margin + 110, y);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(servicio.estado || '-', margin + 110 + 16, y);

  y += 10;

  // =====================
  // CLIENTE Y EQUIPO
  // =====================
  sectionTitle('CLIENTE');

  const clienteNombre = (servicio.cliente_id as any)?.nombre_fantasia ||
                        (servicio.cliente_id as any)?.nombre ||
                        servicio.cliente_id?.datos_contacto?.nombre || '-';
  const clienteTel = (servicio.cliente_id as any)?.telefono || servicio.cliente_id?.datos_contacto?.telefono;
  const tel = Array.isArray(clienteTel) ? clienteTel[0] : clienteTel;
  const clienteDir = (servicio.cliente_id as any)?.direccion;
  const clienteCuit = (servicio.cliente_id as any)?.cuit;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(clienteNombre.toUpperCase(), col1X, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  if (clienteCuit) { doc.text(`CUIT: ${clienteCuit}`, col1X, y); y += 4; }
  if (tel) { doc.text(`Tel: ${tel}`, col1X, y); y += 4; }
  if (clienteDir) { doc.text(`Dir: ${clienteDir}`, col1X, y); y += 4; }
  y += 4;

  sectionTitle('EQUIPO');

  const savedY = y;
  const h1 = labelValue('Marca', servicio.equipo_id?.equipo_id?.marca || '-', col1X);
  y = savedY;
  labelValue('Modelo', servicio.equipo_id?.equipo_id?.modelo || '-', col2X);
  y = savedY + h1;

  const savedY2 = y;
  labelValue('Tipo', servicio.equipo_id?.equipo_id?.tipo || '-', col1X);
  y = savedY2;
  labelValue('N/S', servicio.equipo_id?.numero_serie || '-', col2X);
  y = savedY2 + 12;

  // =====================
  // SERVICIO
  // =====================
  sectionTitle('DETALLE DEL SERVICIO');

  const savedY3 = y;
  labelValue('Tipo de servicio', servicio.tipo_servicio || servicio.tipo_service || '-', col1X);
  y = savedY3;
  labelValue('Modo de contacto', servicio.modo_de_contacto || '-', col2X);
  y = savedY3 + 12;

  const savedY4 = y;
  labelValue('Garantía', servicio.garantia ? `Sí${servicio.tipo_garantia ? ` (${servicio.tipo_garantia})` : ''}` : 'No', col1X);
  y = savedY4;
  labelValue('Estado contable', servicio.estado_contable || '-', col2X);
  y = savedY4 + 12;

  if (servicio.accesorios_entrantes) {
    labelValue('Accesorios entrantes', servicio.accesorios_entrantes, col1X, contentWidth);
    y += 2;
  }

  // Falla reportada
  if (servicio.falla_declarada) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text('Falla reportada:', col1X, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const fallaLines = doc.splitTextToSize(servicio.falla_declarada, contentWidth);
    doc.text(fallaLines, col1X, y);
    y += fallaLines.length * 4 + 4;
  }

  // Diagnóstico
  if (servicio.diagnostico) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text('Diagnóstico / Trabajo realizado:', col1X, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const diagLines = doc.splitTextToSize(servicio.diagnostico, contentWidth);
    doc.text(diagLines, col1X, y);
    y += diagLines.length * 4 + 4;
  }

  // Observaciones
  const observaciones = (servicio as any).observaciones || (servicio as any).comentarios;
  if (observaciones) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text('Observaciones:', col1X, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const obsText = typeof observaciones === 'string' ? observaciones : JSON.stringify(observaciones);
    const obsLines = doc.splitTextToSize(obsText, contentWidth);
    doc.text(obsLines, col1X, y);
    y += obsLines.length * 4 + 4;
  }

  // =====================
  // INSUMOS UTILIZADOS
  // =====================
  const insumos = (servicio as any).insumos_y_costos || (servicio as any).insumos_utilizados;
  const insumosArr = typeof insumos === 'string' ? (() => { try { return JSON.parse(insumos); } catch { return null; } })() : insumos;

  if (Array.isArray(insumosArr) && insumosArr.length > 0) {
    sectionTitle('INSUMOS / REPUESTOS UTILIZADOS');
    checkPageBreak(15 + insumosArr.length * 8);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Código', 'Descripción', 'Cant.']],
      body: insumosArr.map((ins: any) => [
        ins.codigo || '-',
        ins.nombre || ins.descripcion || '-',
        String(ins.cantidad || 1),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer en todas las páginas
  drawFooter(doc, theme);

  return doc;
}

export async function generateFacturaPDF(servicio: ServicioConFactura, orgId: string) {
  const theme = await loadPdfTheme(orgId);
  const doc = new jsPDF();

  // Header con branding
  let startY = drawHeader(doc, theme, 'Factura · Tipo: A');

  // Información de empresa
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(theme.branding.nombre, 20, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`CUIT: ${theme.branding.cuit || ''}`, 20, startY + 5);
  doc.text(`Dirección: ${theme.branding.direccion || ''}`, 20, startY + 10);
  doc.text(`Tel: ${theme.branding.telefono || ''}`, 20, startY + 15);
  doc.setTextColor(...theme.branding.primaryColor);
  doc.text(theme.branding.email || '', 20, startY + 20);
  doc.setTextColor(...PDF_COLORS.ink);

  // Número de factura y fecha
  doc.setFont('helvetica', 'bold');
  doc.text(`Factura N°: ${servicio.id.slice(0, 8)}`, 130, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 130, startY + 5);
  doc.text(`Fecha Servicio: ${new Date(servicio.fecha).toLocaleDateString('es-AR')}`, 130, startY + 10);

  // Cliente
  doc.setLineWidth(0.5);
  doc.setDrawColor(...PDF_COLORS.muted);
  doc.line(20, startY + 22, 190, startY + 22);

  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', 20, startY + 29);
  doc.setFont('helvetica', 'normal');
  doc.text(servicio.cliente_id?.datos_contacto?.nombre || 'N/A', 45, startY + 29);

  if (servicio.cliente_id?.datos_contacto?.telefono) {
    doc.text(`Tel: ${servicio.cliente_id.datos_contacto.telefono}`, 45, startY + 34);
  }
  if (servicio.cliente_id?.datos_contacto?.email) {
    doc.text(`Email: ${servicio.cliente_id.datos_contacto.email}`, 45, startY + 39);
  }

  // Detalle del servicio
  doc.line(20, startY + 47, 190, startY + 47);

  autoTable(doc, {
    startY: startY + 52,
    head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Subtotal']],
    body: [
      [
        `Servicio Técnico - ${servicio.equipo_id?.equipo_id?.marca} ${servicio.equipo_id?.equipo_id?.modelo}`,
        '1',
        formatCurrency(servicio.monto_servicio || 0),
        formatCurrency(servicio.monto_servicio || 0),
      ],
      ...(servicio.monto_insumos
        ? [
            [
              'Insumos y Repuestos',
              '1',
              formatCurrency(servicio.monto_insumos || 0),
              formatCurrency(servicio.monto_insumos || 0),
            ],
          ]
        : []),
    ],
    theme: 'grid',
    headStyles: { fillColor: theme.branding.primaryColor },
  });

  // Totales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  doc.setLineWidth(0.5);
  doc.rect(130, finalY + 10, 60, 40);

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 135, finalY + 18);
  doc.text(formatCurrency(servicio.subtotal), 185, finalY + 18, { align: 'right' });

  doc.text('IVA (21%):', 135, finalY + 26);
  doc.text(formatCurrency(servicio.iva), 185, finalY + 26, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', 135, finalY + 38);
  doc.text(formatCurrency(servicio.total), 185, finalY + 38, { align: 'right' });

  // Observaciones
  if (servicio.diagnostico) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Diagnóstico:', 20, finalY + 55);
    const diagnosticoLines = doc.splitTextToSize(servicio.diagnostico, 170);
    doc.text(diagnosticoLines, 20, finalY + 60);
  }

  // Footer con branding
  drawFooter(doc, theme);

  return doc;
}

export async function generateFacturaCompletaPDF(factura: Factura, orgId: string) {
  const theme = await loadPdfTheme(orgId);
  const doc = new jsPDF();

  // Header con branding
  const tipoFactura = factura.tipo_factura || 'A';
  let startY = drawHeader(doc, theme, `Factura · Tipo: ${tipoFactura}`);

  // Información de empresa
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(theme.branding.nombre, 20, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`CUIT: ${theme.branding.cuit || ''}`, 20, startY + 5);
  doc.text(`Dirección: ${theme.branding.direccion || ''}`, 20, startY + 10);
  doc.text(`Tel: ${theme.branding.telefono || ''}`, 20, startY + 15);
  doc.setTextColor(...theme.branding.primaryColor);
  doc.text(theme.branding.email || '', 20, startY + 20);
  doc.setTextColor(...PDF_COLORS.ink);

  // Número de factura y fecha
  doc.setFont('helvetica', 'bold');
  doc.text(`Factura N°: ${factura.nro_factura || factura.id.slice(0, 8)}`, 130, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date(factura.fecha_emision).toLocaleDateString('es-AR')}`, 130, startY + 5);
  if (factura.fecha_vencimiento) {
    doc.text(`Vencimiento: ${new Date(factura.fecha_vencimiento).toLocaleDateString('es-AR')}`, 130, startY + 10);
    doc.text(`Estado: ${factura.estado.toUpperCase()}`, 130, startY + 15);
  } else {
    doc.text(`Estado: ${factura.estado.toUpperCase()}`, 130, startY + 10);
  }

  // Cliente
  const clienteStartY = factura.fecha_vencimiento ? startY + 25 : startY + 20;
  doc.setLineWidth(0.5);
  doc.setDrawColor(...PDF_COLORS.muted);
  doc.line(20, clienteStartY, 190, clienteStartY);

  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', 20, clienteStartY + 7);
  doc.setFont('helvetica', 'normal');
  const clienteNombre = factura.clientes?.nombre_fantasia || factura.clientes?.nombre || 'Cliente no especificado';
  doc.text(clienteNombre, 45, clienteStartY + 7);

  if (factura.clientes?.identificador_unico) {
    doc.text(`ID: ${factura.clientes.identificador_unico}`, 45, clienteStartY + 12);
  }
  if (factura.clientes?.cuit) {
    doc.text(`CUIT: ${factura.clientes.cuit}`, 45, clienteStartY + 17);
  }

  // Detalle de items facturados
  doc.line(20, clienteStartY + 25, 190, clienteStartY + 25);

  const items = factura.facturas_items || [];
  const itemsData = items.map(item => [
    item.descripcion,
    item.cantidad.toString(),
    formatCurrency(item.precio_unitario),
    formatCurrency(item.subtotal),
  ]);

  if (itemsData.length === 0) {
    itemsData.push(['Sin items facturados', '-', '-', formatCurrency(factura.total)]);
  }

  autoTable(doc, {
    startY: clienteStartY + 30,
    head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Subtotal']],
    body: itemsData,
    theme: 'grid',
    headStyles: { fillColor: theme.branding.primaryColor },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  });

  // Totales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  doc.setLineWidth(0.5);
  doc.rect(130, finalY + 10, 60, 50);

  const totalPagado = factura.total_pagado || 0;
  const totalNC = factura.total_notas_credito || 0;
  const saldoPendiente = factura.saldo_pendiente || (factura.total - totalPagado - totalNC);

  doc.setFont('helvetica', 'normal');
  doc.text('Total Factura:', 135, finalY + 18);
  doc.text(formatCurrency(factura.total), 185, finalY + 18, { align: 'right' });

  if (totalPagado > 0) {
    doc.setTextColor(...STATUS_COLORS.success);
    doc.text('Pagado:', 135, finalY + 26);
    doc.text(`-${formatCurrency(totalPagado)}`, 185, finalY + 26, { align: 'right' });
    doc.setTextColor(...PDF_COLORS.ink);
  }

  if (totalNC > 0) {
    doc.setTextColor(...STATUS_COLORS.warning);
    doc.text('Notas Crédito:', 135, finalY + 34);
    doc.text(`-${formatCurrency(totalNC)}`, 185, finalY + 34, { align: 'right' });
    doc.setTextColor(...PDF_COLORS.ink);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const saldoY = totalNC > 0 ? finalY + 46 : (totalPagado > 0 ? finalY + 38 : finalY + 30);

  if (saldoPendiente <= 0) {
    doc.setTextColor(...STATUS_COLORS.success);
  } else if (factura.estado === 'vencida') {
    doc.setTextColor(...STATUS_COLORS.error);
  } else {
    doc.setTextColor(...STATUS_COLORS.warning);
  }

  doc.text('SALDO:', 135, saldoY);
  doc.text(formatCurrency(saldoPendiente), 185, saldoY, { align: 'right' });
  doc.setTextColor(...PDF_COLORS.ink);

  // Comentarios
  if (factura.comentarios && Array.isArray(factura.comentarios) && factura.comentarios.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Observaciones:', 20, saldoY + 15);
    factura.comentarios.forEach((comentario: any, index: number) => {
      const texto = comentario.texto || comentario;
      const lines = doc.splitTextToSize(texto, 170);
      doc.text(lines, 20, saldoY + 20 + (index * 10));
    });
  }

  // CAE si existe
  if (factura.cae) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`CAE: ${factura.cae}`, 105, doc.internal.pageSize.height - 30, { align: 'center' });
    if (factura.cae_vto) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Vencimiento CAE: ${new Date(factura.cae_vto).toLocaleDateString('es-AR')}`, 105, doc.internal.pageSize.height - 26, { align: 'center' });
    }
  }

  // Footer con branding
  drawFooter(doc, theme);

  return doc;
}

export async function generateCuentaCorrientePDF(
  cuenta: CuentaCorriente,
  movimientos: MovimientoCuentaCorriente[],
  dias?: number,
  orgId?: string
) {
  const theme = await loadPdfTheme(orgId!);
  const doc = new jsPDF();

  // Header con branding
  const subtitle = dias ? `Últimos ${dias} días` : undefined;
  let startY = drawHeader(doc, theme, subtitle ? `Cuenta Corriente · ${subtitle}` : 'Cuenta Corriente');

  // Información del cliente
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text('Cliente:', 20, startY);
  doc.setFont('helvetica', 'normal');
  const clienteNombre = cuenta.nombre_fantasia || cuenta.nombre || 'Sin nombre';
  doc.text(clienteNombre, 45, startY);

  if (cuenta.identificador_unico) {
    doc.setFontSize(10);
    doc.text(`ID: ${cuenta.identificador_unico}`, 45, startY + 6);
  }
  if (cuenta.cuit) {
    doc.text(`CUIT: ${cuenta.cuit}`, 45, startY + 11);
  }

  // Fecha de generación
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 20, startY + 20);

  // Resumen
  doc.setDrawColor(...PDF_COLORS.muted);
  doc.setLineWidth(0.5);
  doc.line(20, startY + 25, 190, startY + 25);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text('Resumen de Cuenta', 20, startY + 32);

  autoTable(doc, {
    startY: startY + 35,
    head: [['Concepto', 'Monto']],
    body: [
      ['Total Facturado', formatCurrency(cuenta.total_facturado)],
      ['Total Pagado', formatCurrency(cuenta.total_pagado)],
      ...(cuenta.total_notas_credito > 0
        ? [['Notas de Crédito', formatCurrency(cuenta.total_notas_credito)]]
        : []
      ),
      ['Saldo Actual', formatCurrency(cuenta.saldo_actual)],
    ],
    theme: 'grid',
    headStyles: { fillColor: theme.branding.primaryColor },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Movimientos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY || 120;

  if (movimientos.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Movimientos', 20, finalY + 10);

    const movimientosData = movimientos.map(mov => {
      const tipo = mov.tipo_movimiento === 'factura' ? 'Factura'
        : mov.tipo_movimiento === 'pago' ? 'Pago'
        : mov.tipo_movimiento === 'nota_credito' ? 'N/C'
        : mov.tipo_movimiento;

      const fecha = new Date(mov.fecha).toLocaleDateString('es-AR');
      const debito = mov.debito > 0 ? formatCurrency(mov.debito) : '-';
      const credito = mov.credito > 0 ? formatCurrency(mov.credito) : '-';
      const saldo = formatCurrency(mov.saldo_acumulado);

      return [fecha, tipo, mov.descripcion, debito, credito, saldo];
    });

    autoTable(doc, {
      startY: finalY + 15,
      head: [['Fecha', 'Tipo', 'Descripción', 'Débito', 'Crédito', 'Saldo']],
      body: movimientosData,
      theme: 'striped',
      headStyles: { fillColor: theme.branding.primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 70 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No hay movimientos registrados en el período seleccionado', 105, finalY + 20, { align: 'center' });
  }

  // Footer con branding
  drawFooter(doc, theme);

  return doc;
}

/**
 * Genera PDF para IVR (Remito Interno de Venta) - Estilo limpio con logo centrado
 */
export async function generateIVRPDF(ivr: Factura, orgId: string) {
  const theme = await loadPdfTheme(orgId);
  const doc = wrapTextSafe(new jsPDF());
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor = theme.branding.primaryColor;
  const textColor = PDF_COLORS.ink;
  const mutedColor = PDF_COLORS.muted;
  const lightBg: [number, number, number] = [249, 250, 251];
  const amberBg: [number, number, number] = [254, 243, 199];
  const borderColor = PDF_COLORS.rule;

  const colWidth = (contentWidth - 10) / 2;
  const col1X = margin;

  const ivrNumero = ivr.nro_factura || ivr.id.slice(0, 8).toUpperCase();

  let y = 12;

  // Helper: salto de página si no entra lo que sigue
  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }
  };

  // Helper: banda de título de sección (mismo estilo que la orden de servicio)
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
    try { doc.addImage(logoBase64, 'PNG', margin, y, 28, 28); } catch { /* continue */ }
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
  doc.text(`Tel: ${theme.branding.telefono || ''} | CUIT: ${theme.branding.cuit || ''}`, infoX, y + 19);
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
  doc.text('REMITO INTERNO (IVR)', docBoxX + docBoxW / 2, y + 8, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${ivrNumero}`, docBoxX + docBoxW / 2, y + 17, { align: 'center' });

  y += 35;

  // Línea separadora + fila de fechas/estado
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const formatDate = (d: string | Date | undefined | null) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return String(d); }
  };

  const estadoLabel = ivr.estado === 'pagada' ? 'Cobrado'
    : ivr.estado === 'pendiente' ? 'Pendiente'
    : (ivr.estado || '-');

  // Inline label + valor
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
  inlineField('Emisión: ', formatDate(ivr.fecha_emision), margin);
  inlineField('Vencimiento: ', formatDate(ivr.fecha_vencimiento), margin + 60);
  inlineField('Estado: ', estadoLabel, margin + 125);

  y += 12;

  // =====================
  // CLIENTE
  // =====================
  sectionTitle('CLIENTE');

  const clienteNombre = ivr.clientes?.nombre_fantasia || ivr.clientes?.nombre || 'No especificado';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(clienteNombre.toUpperCase(), col1X, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  if (ivr.clientes?.nombre_fantasia && ivr.clientes?.nombre) {
    doc.text(ivr.clientes.nombre, col1X, y);
    y += 4;
  }
  if (ivr.clientes?.cuit) {
    doc.text(`CUIT: ${ivr.clientes.cuit}`, col1X, y);
    y += 4;
  }
  if (ivr.clientes?.identificador_unico) {
    doc.text(`ID: ${ivr.clientes.identificador_unico}`, col1X, y);
    y += 4;
  }
  y += 6;

  // =====================
  // DETALLE
  // =====================
  sectionTitle('DETALLE');

  const items = ivr.facturas_items || [];
  const detalles = ivr.detalles as any;
  const insumos = detalles?.insumos || [];

  let itemsData: string[][] = [];
  if (items.length > 0) {
    itemsData = items.map(item => [
      item.descripcion,
      item.cantidad.toString(),
      formatCurrency(item.precio_unitario),
      formatCurrency(item.subtotal),
    ]);
  } else if (insumos.length > 0) {
    itemsData = insumos.map((insumo: any) => [
      insumo.nombre || insumo.descripcion || '-',
      (insumo.cantidad || 1).toString(),
      formatCurrency(insumo.precio_unitario || insumo.monto || 0),
      formatCurrency(insumo.subtotal || insumo.monto || 0),
    ]);
  } else {
    itemsData = [['Sin items', '-', '-', formatCurrency(Number(ivr.total))]];
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Descripción', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: itemsData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 34, halign: 'right' },
      3: { cellWidth: 34, halign: 'right' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // =====================
  // RESUMEN (cuadro de totales)
  // =====================
  checkPageBreak(45);
  const totBoxWidth = 80;
  const totBoxX = pageWidth - margin - totBoxWidth;

  doc.setFillColor(...lightBg);
  doc.rect(totBoxX, y, totBoxWidth, 35, 'F');
  doc.setDrawColor(...borderColor);
  doc.rect(totBoxX, y, totBoxWidth, 35, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('Subtotal:', totBoxX + 5, y + 10);
  doc.text(formatCurrency(Number(ivr.subtotal || ivr.total)), totBoxX + totBoxWidth - 5, y + 10, { align: 'right' });

  const totalPagado = Number(ivr.total_pagado) || 0;
  doc.text('Cobrado:', totBoxX + 5, y + 18);
  doc.setTextColor(...STATUS_COLORS.success);
  doc.text(formatCurrency(totalPagado), totBoxX + totBoxWidth - 5, y + 18, { align: 'right' });

  const saldoPendiente = Number(ivr.saldo_pendiente) || (Number(ivr.total) - totalPagado);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Saldo Pendiente:', totBoxX + 5, y + 28);
  doc.setTextColor(...(saldoPendiente > 0 ? STATUS_COLORS.error : STATUS_COLORS.success));
  doc.text(formatCurrency(saldoPendiente), totBoxX + totBoxWidth - 5, y + 28, { align: 'right' });

  y += 45;

  // =====================
  // NOTAS (si existen)
  // =====================
  // Notas internas que NO deben verse en el documento del cliente:
  // la traza de "Factura generada desde servicio/orden #xxx".
  const NOTA_INTERNA_RE = /generad[ao]\s+desde\s+(servicio|orden)/i;
  const notasCrudas: string[] = detalles?.notas
    ? (Array.isArray(detalles.notas) ? detalles.notas : String(detalles.notas).split('\n'))
    : (Array.isArray(ivr.comentarios)
        ? ivr.comentarios.map((c: any) => (typeof c === 'string' ? c : c?.texto || ''))
        : []);
  const notas = notasCrudas
    .map((n) => String(n || '').trim())
    .filter((n) => n && !NOTA_INTERNA_RE.test(n))
    .join('\n');
  if (notas) {
    sectionTitle('NOTAS');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    const notasLines = doc.splitTextToSize(notas, contentWidth);
    checkPageBreak(notasLines.length * 4 + 6);
    doc.text(notasLines, margin, y);
    y += notasLines.length * 4 + 8;
  }

  // =====================
  // OBSERVACIÓN (condiciones de pago — mismo texto que el email)
  // =====================
  sectionTitle('OBSERVACIÓN');

  const obsText =
    'Estimados,\n\n' +
    '1. Les informamos que los comprobantes IVR solo podrán abonarse en EFECTIVO. ' +
    'En caso de depositarlo o transferirlo a nuestra cuenta, se le adicionará el 21% IVA.\n\n' +
    '2. Todos los comprobantes de IVR vencen a los 15 días. Los que excedan ese plazo, ' +
    'DEBERÁN ser cancelados a la brevedad.\n\n' +
    `Cualquier duda comunicarse al Tel: ${theme.branding.telefono || '-'}` +
    (theme.branding.email ? ` o Email: ${theme.branding.email}` : '') + '.\n\n' +
    'Quedamos a su disposición.';

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const obsLines = doc.splitTextToSize(obsText, contentWidth - 12);
  const obsBoxHeight = obsLines.length * 4.4 + 10;
  checkPageBreak(obsBoxHeight + 4);

  // Banda ámbar con borde de acento (mismo look que el email)
  doc.setFillColor(...amberBg);
  doc.rect(margin, y, contentWidth, obsBoxHeight, 'F');
  doc.setFillColor(...STATUS_COLORS.warning);
  doc.rect(margin, y, 1.5, obsBoxHeight, 'F');
  doc.setTextColor(...textColor);
  doc.text(obsLines, margin + 6, y + 7);
  y += obsBoxHeight + 8;

  // =====================
  // AVISO DOCUMENTO INTERNO
  // =====================
  checkPageBreak(12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...mutedColor);
  doc.text('* Este documento es un remito interno y no tiene validez fiscal.', margin, y);

  // Footer en todas las páginas
  drawFooter(doc, theme);

  return doc;
}

/**
 * Genera el PDF de un IVR y lo devuelve como base64 (sin el prefijo data URI).
 * Usado para adjuntar el comprobante en el envío por email.
 */
export async function getIVRPDFBase64(ivr: Factura, orgId: string): Promise<string> {
  const doc = await generateIVRPDF(ivr, orgId);
  return doc.output('datauristring').split(',')[1];
}

/**
 * Genera PDF para resumen de pago
 */
export async function generatePagoPDF(pago: {
  id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  factura?: Factura;
  cliente?: { nombre: string; nombre_fantasia?: string; cuit?: string };
  comentarios?: any[];
}, orgId: string) {
  const theme = await loadPdfTheme(orgId);
  const doc = new jsPDF();

  // Header con branding
  let startY = drawHeader(doc, theme, `Comprobante de Pago · N° ${pago.id.slice(0, 8)}`);

  // Información de empresa
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(theme.branding.nombre, 20, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`CUIT: ${theme.branding.cuit || ''}`, 20, startY + 5);
  doc.setTextColor(...theme.branding.primaryColor);
  doc.text(theme.branding.email || '', 20, startY + 10);
  doc.setTextColor(...PDF_COLORS.ink);

  // Info del pago
  doc.setFont('helvetica', 'bold');
  doc.text(`Fecha de Pago: ${new Date(pago.fecha_pago).toLocaleDateString('es-AR')}`, 130, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Método: ${pago.metodo_pago}`, 130, startY + 5);

  // Cliente
  if (pago.cliente) {
    doc.setLineWidth(0.5);
    doc.setDrawColor(...PDF_COLORS.muted);
    doc.line(20, startY + 20, 190, startY + 20);

    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 20, startY + 27);
    doc.setFont('helvetica', 'normal');
    doc.text(pago.cliente.nombre || pago.cliente.nombre_fantasia, 45, startY + 27);
    if (pago.cliente.cuit) {
      doc.text(`CUIT: ${pago.cliente.cuit}`, 45, startY + 32);
    }
  }

  // Detalle del pago
  autoTable(doc, {
    startY: startY + 45,
    head: [['Concepto', 'Detalle']],
    body: [
      ['Monto del Pago', formatCurrency(pago.monto)],
      ['Fecha de Pago', new Date(pago.fecha_pago).toLocaleDateString('es-AR')],
      ['Método de Pago', pago.metodo_pago],
      ...(pago.factura ? [['Factura Asociada', `${pago.factura.tipo_factura} - ${pago.factura.nro_factura || pago.factura.id.slice(0, 8)}`]] : []),
    ],
    theme: 'grid',
    headStyles: { fillColor: theme.branding.primaryColor },
  });

  // Monto destacado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 120;

  doc.setFillColor(...theme.branding.primaryColor);
  doc.rect(60, finalY + 15, 90, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTO RECIBIDO', 105, finalY + 25, { align: 'center' });
  doc.setFontSize(18);
  doc.text(formatCurrency(pago.monto), 105, finalY + 35, { align: 'center' });

  doc.setTextColor(...PDF_COLORS.ink);

  // Comentarios
  if (pago.comentarios && Array.isArray(pago.comentarios) && pago.comentarios.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Observaciones:', 20, finalY + 55);
    pago.comentarios.forEach((comentario: any, index: number) => {
      const texto = comentario.texto || comentario;
      const lines = doc.splitTextToSize(texto, 170);
      doc.text(lines, 20, finalY + 60 + (index * 10));
    });
  }

  // Footer con branding
  drawFooter(doc, theme);

  return doc;
}

// Labels para tipos de servicio
const tipoServicioLabels: Record<string, string> = {
  mantenimiento_preventivo: 'Mantenimiento Preventivo',
  mantenimiento_correctivo: 'Mantenimiento Correctivo',
  reparacion: 'Reparación',
  instalacion: 'Instalación',
  desinstalacion: 'Desinstalación',
  calibracion: 'Calibración',
  inspeccion: 'Inspección',
  capacitacion: 'Capacitación',
};

const estadoServicioLabels: Record<string, string> = {
  solicitado: 'Solicitado',
  programado: 'Programado',
  en_ruta: 'En Ruta',
  en_proceso: 'En Proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
  reprogramado: 'Reprogramado',
};

/**
 * Genera PDF para Servicio Técnico del sistema de equipos
 */
export async function generateEquipoServicioTecnicoPDF(servicio: EquipoServicioTecnico, orgId: string) {
  const theme = await loadPdfTheme(orgId);
  const doc = new jsPDF();

  // Header con branding
  const tipoLabel = tipoServicioLabels[servicio.tipo] || servicio.tipo;
  let startY = drawHeader(doc, theme, `Orden de Servicio Técnico · ${tipoLabel}`);

  // Información del equipo (lado izquierdo)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text('EQUIPO', 20, startY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const equipoInfo = [
    `Código: ${servicio.equipo_unidad?.codigo || 'N/A'}`,
    `${servicio.equipo_unidad?.equipo?.marca || ''} ${servicio.equipo_unidad?.equipo?.modelo || ''}`.trim() || 'N/A',
    `Serie: ${servicio.equipo_unidad?.numero_serie || 'N/A'}`,
    servicio.equipo_unidad?.equipo?.tipo ? `Tipo: ${servicio.equipo_unidad.equipo.tipo}` : '',
  ].filter(Boolean);

  equipoInfo.forEach((line, i) => {
    doc.text(line, 20, startY + 6 + (i * 5));
  });

  // Información del cliente (lado derecho)
  if (servicio.cliente) {
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 115, startY);
    doc.setFont('helvetica', 'normal');

    const clienteInfo = [
      servicio.cliente.nombre_fantasia || servicio.cliente.nombre,
      servicio.cliente.cuit ? `CUIT: ${servicio.cliente.cuit}` : '',
      servicio.cliente.telefono?.[0] ? `Tel: ${servicio.cliente.telefono[0]}` : '',
      servicio.cliente.direccion || '',
    ].filter(Boolean);

    clienteInfo.forEach((line, i) => {
      const lines = doc.splitTextToSize(line, 75);
      doc.text(lines, 115, startY + 6 + (i * 5));
    });
  }

  // Línea divisoria
  startY += 35;
  doc.setLineWidth(0.3);
  doc.setDrawColor(...PDF_COLORS.muted);
  doc.line(20, startY, 190, startY);
  startY += 7;

  // Información del servicio en tabla
  const servicioData = [
    ['Estado', estadoServicioLabels[servicio.estado] || servicio.estado],
    ['Prioridad', servicio.prioridad?.charAt(0).toUpperCase() + servicio.prioridad?.slice(1)],
    ['Fecha Solicitud', servicio.fecha_solicitud ? new Date(servicio.fecha_solicitud).toLocaleDateString('es-AR') : 'N/A'],
    ['Fecha Programada', servicio.fecha_programada ? new Date(servicio.fecha_programada).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'N/A'],
    ['Técnico Asignado', servicio.tecnico_nombre || 'Sin asignar'],
    ['Ubicación', servicio.ubicacion_servicio || 'N/A'],
  ];

  if (servicio.fecha_finalizacion) {
    servicioData.push(['Fecha Finalización', new Date(servicio.fecha_finalizacion).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })]);
  }

  autoTable(doc, {
    startY: startY,
    head: [['Campo', 'Detalle']],
    body: servicioData,
    theme: 'striped',
    headStyles: { fillColor: theme.branding.primaryColor },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 120 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Motivo / Falla
  if (servicio.motivo) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MOTIVO / FALLA REPORTADA:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const motivoLines = doc.splitTextToSize(servicio.motivo, 170);
    doc.text(motivoLines, 20, currentY + 5);
    currentY += 5 + (motivoLines.length * 4) + 8;
  }

  // Diagnóstico
  if (servicio.diagnostico) {
    doc.setFont('helvetica', 'bold');
    doc.text('DIAGNÓSTICO:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const diagLines = doc.splitTextToSize(servicio.diagnostico, 170);
    doc.text(diagLines, 20, currentY + 5);
    currentY += 5 + (diagLines.length * 4) + 8;
  }

  // Trabajo realizado
  if (servicio.trabajo_realizado) {
    doc.setFont('helvetica', 'bold');
    doc.text('TRABAJO REALIZADO:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const trabajoLines = doc.splitTextToSize(servicio.trabajo_realizado, 170);
    doc.text(trabajoLines, 20, currentY + 5);
    currentY += 5 + (trabajoLines.length * 4) + 8;
  }

  // Recomendaciones
  if (servicio.recomendaciones) {
    doc.setFont('helvetica', 'bold');
    doc.text('RECOMENDACIONES:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const recLines = doc.splitTextToSize(servicio.recomendaciones, 170);
    doc.text(recLines, 20, currentY + 5);
    currentY += 5 + (recLines.length * 4) + 8;
  }

  // Insumos utilizados
  if (servicio.insumos_utilizados && Array.isArray(servicio.insumos_utilizados) && servicio.insumos_utilizados.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('INSUMOS UTILIZADOS:', 20, currentY);

    const insumosData = servicio.insumos_utilizados.map((insumo: any) => [
      insumo.codigo || '-',
      insumo.nombre || insumo.descripcion || '-',
      insumo.cantidad?.toString() || '1',
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Código', 'Descripción', 'Cantidad']],
      body: insumosData,
      theme: 'grid',
      headStyles: { fillColor: theme.branding.primaryColor },
      styles: { fontSize: 9 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Costos
  if (servicio.costo_total > 0) {
    // Verificar si hay espacio suficiente, sino nueva página
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(245, 245, 250);
    doc.rect(110, currentY - 3, 80, 35, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text('DETALLE DE COSTOS', 150, currentY + 3, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Mano de obra: ${formatCurrency(servicio.costo_mano_obra || 0)}`, 150, currentY + 11, { align: 'center' });
    doc.text(`Repuestos: ${formatCurrency(servicio.costo_repuestos || 0)}`, 150, currentY + 17, { align: 'center' });

    doc.setFillColor(...theme.branding.primaryColor);
    doc.rect(115, currentY + 22, 70, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(servicio.costo_total)}`, 150, currentY + 28, { align: 'center' });

    doc.setTextColor(...PDF_COLORS.ink);
  }

  // Footer con branding
  drawFooter(doc, theme);

  return doc;
}

/**
 * Retorna el PDF de servicio técnico como base64
 */
export async function getEquipoServicioTecnicoPDFBase64(servicio: EquipoServicioTecnico, orgId: string): Promise<string> {
  const doc = await generateEquipoServicioTecnicoPDF(servicio, orgId);
  return doc.output('datauristring').split(',')[1];
}

// ============================================================================
// REMITO PDF
// ============================================================================

/**
 * Tipo mínimo que consume generateRemitoPDF. No depende del type `Remito` del
 * lib/types porque cada llamante puede traer distinto join. Los campos de
 * sin_cargo y motivo_sin_cargo vienen del pedido origen (migración 887).
 */
export interface RemitoPDFData {
  id: string;
  numero: string;
  fecha: string; // ISO o YYYY-MM-DD
  estado?: string;
  firmado?: boolean;
  firmado_por?: string | null;
  // Cliente (snapshot para la impresión, join opcional)
  cliente?: {
    nombre?: string | null;
    cuit?: string | null;
    direccion?: string | null;
    localidad?: string | null;
    provincia?: string | null;
  } | null;
  // Items del remito: descripción y cantidades solamente (sin precios).
  items: Array<{
    descripcion: string;
    cantidad: number | string;
    codigo?: string | null;
    marca?: string | null;
  }>;
  // Flags del pedido origen para el modo "interno sin cargo" (migración 887).
  sin_cargo?: boolean;
  motivo_sin_cargo?: string | null;
  // Observaciones del remito o del pedido origen.
  observaciones?: string | null;
}

/**
 * Genera el PDF de un remito de venta.
 *
 * Dos modos de renderizado según el flag `sin_cargo`:
 *
 * 1. **Remito normal** — header "REMITO" con branding + datos del cliente +
 *    tabla de items con descripción, cantidad y código/marca. NO incluye
 *    precios (los remitos no los muestran por default en este negocio).
 *
 * 2. **Remito Interno Sin Cargo** — mismo layout pero con:
 *    - Título "REMITO INTERNO SIN CARGO"
 *    - Banda amarilla destacada con la leyenda "SIN CARGO - NO FACTURABLE"
 *    - Motivo del sin cargo impreso prominente
 *    - Disclaimer al pie: "Este comprobante es interno. No tiene validez fiscal."
 *
 * Ambos casos aceptan `firmado_por` para imprimir "Recibido por: XXXX" cuando
 * el remito ya fue firmado por el cliente.
 */
export async function generateRemitoPDF(remito: RemitoPDFData, orgId: string) {
  const theme = await loadPdfTheme(orgId);
  const doc = new jsPDF();
  const esSinCargo = !!remito.sin_cargo;

  const titulo = esSinCargo ? 'REMITO INTERNO SIN CARGO' : 'REMITO';
  const subtitulo = esSinCargo ? 'No facturable — Uso interno' : `N° ${remito.numero}`;

  let startY = drawHeader(doc, theme, `${titulo} · ${subtitulo}`);

  // Banda de SIN CARGO: franja amarilla destacada inmediatamente debajo del header
  // con la leyenda y el motivo. Visualmente imposible de confundir con un
  // remito normal.
  if (esSinCargo) {
    const bandY = startY - 3;
    doc.setFillColor(255, 243, 205); // amarillo claro
    doc.rect(15, bandY, 180, 18, 'F');
    doc.setDrawColor(217, 119, 6); // amber-600
    doc.setLineWidth(0.8);
    doc.rect(15, bandY, 180, 18, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(146, 64, 14); // amber-900
    doc.text('SIN CARGO — NO FACTURABLE', 20, bandY + 7);
    if (remito.motivo_sin_cargo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      // Truncar motivo si es muy largo (evita overflow de la banda)
      const motivoMax = remito.motivo_sin_cargo.length > 110
        ? remito.motivo_sin_cargo.slice(0, 108) + '…'
        : remito.motivo_sin_cargo;
      doc.text(`Motivo: ${motivoMax}`, 20, bandY + 13);
    }
    doc.setTextColor(...PDF_COLORS.ink);
    doc.setLineWidth(0.2);
    startY = bandY + 24;
  }

  // Datos de la empresa a la izquierda
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(theme.branding.nombre, 20, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`CUIT: ${theme.branding.cuit || ''}`, 20, startY + 5);
  doc.text(`${theme.branding.direccion || ''}`, 20, startY + 10);
  doc.text(`Tel: ${theme.branding.telefono || ''}`, 20, startY + 15);

  // Número de remito + fecha a la derecha
  doc.setFont('helvetica', 'bold');
  doc.text(`Remito N°: ${remito.numero}`, 130, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date(remito.fecha).toLocaleDateString('es-AR')}`, 130, startY + 5);
  if (remito.estado) {
    doc.text(`Estado: ${remito.estado.toUpperCase()}`, 130, startY + 10);
  }

  // Separador
  const clienteY = startY + 25;
  doc.setLineWidth(0.5);
  doc.setDrawColor(...PDF_COLORS.muted);
  doc.line(20, clienteY, 190, clienteY);

  // Cliente: para sin_cargo mostramos TODO el cliente (a quien se le entregó)
  // pero quedó claro por la banda que no se le factura.
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATARIO:', 20, clienteY + 7);
  doc.setFont('helvetica', 'normal');
  const clienteNombre = remito.cliente?.nombre || 'Cliente no especificado';
  doc.text(clienteNombre, 55, clienteY + 7);
  let line = clienteY + 12;
  if (remito.cliente?.cuit) {
    doc.text(`CUIT: ${remito.cliente.cuit}`, 55, line);
    line += 5;
  }
  if (remito.cliente?.direccion) {
    const dir = [remito.cliente.direccion, remito.cliente.localidad, remito.cliente.provincia]
      .filter(Boolean)
      .join(', ');
    doc.text(dir, 55, line);
    line += 5;
  }

  // Separador antes de la tabla
  const tablaY = Math.max(line + 3, clienteY + 25);
  doc.line(20, tablaY, 190, tablaY);

  // Tabla de items — SIN columna de precios (ni en el remito normal ni en SC).
  // Las columnas son: Código | Descripción | Marca | Cantidad.
  const items = remito.items || [];
  const itemsData = items.map((it) => [
    it.codigo || '—',
    it.descripcion,
    it.marca || '—',
    String(it.cantidad ?? ''),
  ]);

  if (itemsData.length === 0) {
    itemsData.push(['—', 'Sin items', '—', '—']);
  }

  autoTable(doc, {
    startY: tablaY + 5,
    head: [['Código', 'Descripción', 'Marca', 'Cant.']],
    body: itemsData,
    theme: 'grid',
    headStyles: { fillColor: esSinCargo ? [217, 119, 6] : theme.branding.primaryColor },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 90 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20, halign: 'center' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY ?? tablaY + 50;

  // Espacio requerido al pie del documento: observaciones (opcional) +
  // zona de firma + disclaimer (opcional, solo sin_cargo). Si el alto
  // restante en la página actual no alcanza, pasamos a una página nueva
  // antes de dibujar estos elementos. Esto evita el bug de superposición
  // cuando autoTable pagina automáticamente y el hardcoded Y=230 de la
  // versión anterior caía encima del último row de la tabla.
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerReserve = 40; // espacio para el branded footer
  const obsHeight = remito.observaciones
    ? 15 + doc.splitTextToSize(remito.observaciones, 170).length * 4
    : 0;
  const firmaHeight = 25;
  const disclaimerHeight = esSinCargo ? 10 : 0;
  const requiredSpace = obsHeight + firmaHeight + disclaimerHeight + footerReserve;

  if (finalY + requiredSpace > pageHeight) {
    doc.addPage();
    finalY = 20;
  }

  // Observaciones
  if (remito.observaciones) {
    finalY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Observaciones:', 20, finalY);
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(remito.observaciones, 170);
    doc.text(obsLines, 20, finalY + 5);
    finalY += 5 + obsLines.length * 4;
  }

  // Zona de firma del receptor — siempre abajo pero respetando finalY tras
  // la tabla y las observaciones (sin saltar a la posición hardcoded).
  // Si la zona de firma caería encima del footer, añadimos página nueva.
  const firmaY = Math.max(finalY + 20, pageHeight - footerReserve - firmaHeight);

  doc.setLineWidth(0.3);
  doc.line(20, firmaY, 90, firmaY);
  doc.line(110, firmaY, 180, firmaY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma del receptor', 35, firmaY + 4);
  doc.text('Aclaración', 135, firmaY + 4);

  if (remito.firmado && remito.firmado_por) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(`Recibido por: ${remito.firmado_por}`, 20, firmaY - 3);
    doc.setTextColor(...PDF_COLORS.ink);
  }

  // Disclaimer para sin cargo: línea extra al pie antes del branded footer
  if (esSinCargo) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text(
      'Este comprobante es interno. No tiene validez fiscal. No se factura a AFIP.',
      20,
      firmaY + 15
    );
    doc.setTextColor(...PDF_COLORS.ink);
  }

  drawFooter(doc, theme);
  return doc;
}

// ============================================================================
// CUENTA CORRIENTE IVR / PROVEEDOR PDFs
// ============================================================================

export async function generateCuentaCorrienteIvrPDF(
  cuenta: CuentaCorrienteIvr,
  movimientos: MovimientoIvr[],
  dias?: number,
  orgId?: string
) {
  const theme = await loadPdfTheme(orgId!);
  const doc = new jsPDF();
  const subtitle = dias ? `Últimos ${dias} días` : undefined;
  let startY = drawHeader(doc, theme, subtitle ? `Cuenta Corriente IVR · ${subtitle}` : 'Cuenta Corriente IVR');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text('Cliente:', 20, startY);
  doc.setFont('helvetica', 'normal');
  const clienteNombre = cuenta.nombre_fantasia || cuenta.nombre || 'Sin nombre';
  doc.text(clienteNombre, 45, startY);

  if (cuenta.identificador_unico) {
    doc.setFontSize(10);
    doc.text(`ID: ${cuenta.identificador_unico}`, 45, startY + 6);
  }
  if (cuenta.cuit) {
    doc.text(`CUIT: ${cuenta.cuit}`, 45, startY + 11);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    `Generado: ${new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    20,
    startY + 20
  );

  doc.setDrawColor(...PDF_COLORS.muted);
  doc.setLineWidth(0.5);
  doc.line(20, startY + 25, 190, startY + 25);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text('Resumen de Cuenta IVR', 20, startY + 32);

  autoTable(doc, {
    startY: startY + 35,
    head: [['Concepto', 'Monto']],
    body: [
      ['Total Remitido', formatCurrency(cuenta.total_remitido)],
      ['Total Cobrado', formatCurrency(cuenta.total_cobrado)],
      ['Saldo Actual', formatCurrency(cuenta.saldo_actual)],
    ],
    theme: 'grid',
    headStyles: { fillColor: theme.branding.primaryColor },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY || 120;

  if (movimientos.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Movimientos', 20, finalY + 10);

    const movimientosData = movimientos.map((mov) => {
      const tipo =
        mov.tipo_movimiento === 'ivr'
          ? 'Remito'
          : mov.tipo_movimiento === 'cobro'
          ? 'Cobro'
          : mov.tipo_movimiento;
      const fecha = new Date(mov.fecha).toLocaleDateString('es-AR');
      const debito = mov.debito > 0 ? formatCurrency(mov.debito) : '-';
      const credito = mov.credito > 0 ? formatCurrency(mov.credito) : '-';
      const saldo = formatCurrency(mov.saldo_acumulado);
      return [fecha, tipo, mov.descripcion, debito, credito, saldo];
    });

    autoTable(doc, {
      startY: finalY + 15,
      head: [['Fecha', 'Tipo', 'Descripción', 'Débito', 'Crédito', 'Saldo']],
      body: movimientosData,
      theme: 'striped',
      headStyles: { fillColor: theme.branding.primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 70 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'No hay movimientos registrados en el período seleccionado',
      105,
      finalY + 20,
      { align: 'center' }
    );
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    '* Documento interno de remitos. No tiene validez fiscal.',
    105,
    doc.internal.pageSize.height - 30,
    { align: 'center' }
  );

  drawFooter(doc, theme);
  return doc;
}

export async function generateCuentaCorrienteProveedorPDF(
  cuenta: CuentaCorrienteProveedor,
  movimientos: MovimientoProveedor[],
  dias?: number,
  orgId?: string
) {
  const theme = await loadPdfTheme(orgId!);
  const doc = new jsPDF();
  const subtitle = dias ? `Últimos ${dias} días` : undefined;
  let startY = drawHeader(doc, theme, subtitle ? `Cuenta Corriente Proveedor · ${subtitle}` : 'Cuenta Corriente Proveedor');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text('Proveedor:', 20, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(cuenta.nombre || 'Sin nombre', 52, startY);

  if (cuenta.cuit) {
    doc.setFontSize(10);
    doc.text(`CUIT: ${cuenta.cuit}`, 52, startY + 6);
  }
  if (cuenta.condiciones_pago) {
    doc.text(`Condiciones: ${cuenta.condiciones_pago}`, 52, startY + 11);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    `Generado: ${new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    20,
    startY + 20
  );

  doc.setDrawColor(...PDF_COLORS.muted);
  doc.setLineWidth(0.5);
  doc.line(20, startY + 25, 190, startY + 25);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text('Resumen de Cuenta', 20, startY + 32);

  autoTable(doc, {
    startY: startY + 35,
    head: [['Concepto', 'Monto']],
    body: [
      ['Total Compras', formatCurrency(cuenta.total_compras)],
      ['Total Pagado', formatCurrency(cuenta.total_pagado)],
      ['Saldo Pendiente', formatCurrency(cuenta.saldo_pendiente)],
    ],
    theme: 'grid',
    headStyles: { fillColor: theme.branding.primaryColor },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY || 120;

  if (movimientos.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Movimientos', 20, finalY + 10);

    const movimientosData = movimientos.map((mov) => {
      const tipo =
        mov.tipo_movimiento === 'compra'
          ? 'Compra'
          : mov.tipo_movimiento === 'pago'
          ? 'Pago'
          : mov.tipo_movimiento === 'nota_credito'
          ? 'N/C'
          : mov.tipo_movimiento === 'nota_debito'
          ? 'N/D'
          : mov.tipo_movimiento;
      const fecha = new Date(mov.fecha).toLocaleDateString('es-AR');
      const debito = mov.debito > 0 ? formatCurrency(mov.debito) : '-';
      const credito = mov.credito > 0 ? formatCurrency(mov.credito) : '-';
      const saldo = formatCurrency(mov.saldo_acumulado);
      return [fecha, tipo, mov.descripcion, debito, credito, saldo];
    });

    autoTable(doc, {
      startY: finalY + 15,
      head: [['Fecha', 'Tipo', 'Descripción', 'Débito', 'Crédito', 'Saldo']],
      body: movimientosData,
      theme: 'striped',
      headStyles: { fillColor: theme.branding.primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 70 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'No hay movimientos registrados en el período seleccionado',
      105,
      finalY + 20,
      { align: 'center' }
    );
  }

  drawFooter(doc, theme);
  return doc;
}

// =========================================================================
// HISTORIAL DE SERVICIOS TÉCNICOS (PDF agregado)
// =========================================================================

export interface HistorialServiciosOptions {
  contextoLabel: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export async function generateHistorialServiciosPDF(
  servicios: any[],
  orgId: string,
  opts: HistorialServiciosOptions
) {
  const theme = await loadPdfTheme(orgId);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const primary = theme.branding.primaryColor;
  const ink = PDF_COLORS.ink;
  const muted = PDF_COLORS.muted;

  // ---- Cover / encabezado ----
  drawHeader(doc, theme, "HISTORIAL DE SERVICIOS TÉCNICOS");

  let y = 48;

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(opts.contextoLabel, margin, y);
  y += 7;

  const rango: string[] = [];
  if (opts.fechaDesde) rango.push(`desde ${opts.fechaDesde}`);
  if (opts.fechaHasta) rango.push(`hasta ${opts.fechaHasta}`);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(`Órdenes incluidas: ${servicios.length}${rango.length ? ` · ${rango.join(" ")}` : ""}`, margin, y);
  y += 4;
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, margin, y);
  y += 8;

  // ---- Tabla resumen ----
  const fmtMoney = (n: any) => {
    const v = Number(n || 0);
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);
  };

  const rows = servicios.map((s: any) => {
    const eu = s.equipo_id;
    const eq = eu?.equipo_id;
    const equipoLabel = [eq?.marca, eq?.modelo].filter(Boolean).join(" ") || eq?.tipo || "-";
    const serie = eu?.numero_serie ? `\nS/N ${eu.numero_serie}` : "";
    const total = Number(s.monto_servicio || 0) + Number(s.monto_insumos || 0);
    const fecha = s.fecha ? new Date(s.fecha).toLocaleDateString("es-AR") : "-";
    const nro = String(s.nro_orden || "").padStart(5, "0");
    return [
      `#${nro}\n${fecha}`,
      `${equipoLabel}${serie}`,
      s.tipo_servicio || s.tipo || "-",
      s.estado || "-",
      s.tecnico || "-",
      [s.falla_declarada, s.diagnostico].filter(Boolean).join("\n").slice(0, 200),
      s.sin_cargo ? "Sin cargo" : fmtMoney(total),
    ];
  });

  const totalMonto = servicios.reduce(
    (acc: number, s: any) => acc + Number(s.monto_servicio || 0) + Number(s.monto_insumos || 0),
    0
  );

  autoTable(doc, {
    startY: y,
    head: [["N° / Fecha", "Equipo", "Tipo", "Estado", "Técnico", "Falla / Diagnóstico", "Monto"]],
    body: rows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: ink as any, lineColor: PDF_COLORS.rule as any },
    headStyles: { fillColor: primary as any, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 36 },
      2: { cellWidth: 20 },
      3: { cellWidth: 22 },
      4: { cellWidth: 24 },
      5: { cellWidth: 40 },
      6: { cellWidth: "auto", halign: "right" },
    },
    theme: "grid",
    didDrawPage: () => {
      drawFooter(doc, theme);
    },
  });

  // ---- Totales ----
  const finalY = (doc as any).lastAutoTable?.finalY || y;
  const remainSpace = doc.internal.pageSize.height - finalY;
  if (remainSpace < 30) {
    doc.addPage();
  }
  const totY = remainSpace < 30 ? 30 : finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text(`Total acumulado: ${fmtMoney(totalMonto)}`, pageWidth - margin, totY, { align: "right" });

  return doc;
}
