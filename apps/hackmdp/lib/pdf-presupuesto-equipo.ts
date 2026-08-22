import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  loadPdfTheme,
  drawHeader,
  drawFooter,
  drawSectionTitle,
  PDF_COLORS,
  type FooterFirma,
} from './pdf-theme';
import type { TotalPorMoneda } from './presupuesto-equipo-totales';

interface EquipoCatalogo {
  id: string;
  marca?: string | null;
  modelo?: string | null;
  tipo?: string | null;
  condicion?: string | null;
  descripcion_comercial?: string | null;
  especificaciones?: Record<string, unknown> | unknown[] | null;
  imagen_url?: string | null;
  imagen_base64?: string | null;
  precio_lista?: number | null;
  precio_lista_moneda?: string | null;
}

interface PresupuestoEquipoItem {
  tipo?: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  es_opcional?: boolean;
  incluido_en_precio?: boolean;
  equipo_id?: string | null;
  producto_id?: string | null;
  imagen_url?: string | null;
}

interface PresupuestoEquipoCliente {
  nombre?: string;
  nombre_fantasia?: string;
  cuit?: string;
  email?: string[] | string;
  telefono?: string[] | string;
  direccion?: string;
}

interface UsuarioFirma {
  nombre_completo?: string;
  cargo?: string;
  email?: string;
  telefono_directo?: string;
  firma_activa?: boolean;
}

export interface PresupuestoEquipoData {
  numero: string;
  titulo?: string | null;
  fecha_emision: string;
  fecha_vencimiento?: string | null;
  validez_dias?: number | null;
  estado?: string | null;
  moneda?: string | null;
  cotizacion_usd?: number | null;
  tipo_cotizacion?: string | null;
  forma_pago?: string | null;
  financiacion_cuotas?: number | null;
  interes_porcentaje?: number | null;
  tiempo_entrega?: string | null;
  garantia?: string | null;
  incluye_instalacion?: boolean;
  incluye_capacitacion?: boolean;
  descripcion_comercial?: string | null;
  especificaciones_tecnicas?: string | null;
  beneficios?: string | null;
  observaciones?: string | null;
  terminos_condiciones?: string | null;
  subtotal: number;
  descuento_porcentaje?: number;
  descuento_monto?: number;
  iva?: number;
  total: number;
  /** Totales por moneda (uno por cada moneda presente). Si tiene >1 entrada, el
   *  presupuesto mezcla monedas y los totales se muestran agrupados, sin convertir.
   *  Si es undefined/1 entrada, se usa el bloque de totales clásico del header. */
  totalesPorMoneda?: TotalPorMoneda[];
  cliente?: PresupuestoEquipoCliente | null;
  /** Ordered list of equipos to render as hojas de producto (header + items de tipo equipo) */
  equipos: EquipoCatalogo[];
  /** Non-equipo items (accesorios, insumos, servicios) */
  accesorios: PresupuestoEquipoItem[];
  /** Optional: equipo quantities keyed by equipo.id */
  equipoCantidades?: Record<string, number>;
  /** Documentos extra adjuntados desde la biblioteca (renderizados como links al final). */
  documentos?: Array<{ titulo: string; link: string; descripcion?: string | null }>;
  usuario?: UsuarioFirma;
}

function formatCurrency(amount: number, currency: string = 'ARS'): string {
  const cur = currency === 'USD' ? 'USD' : 'ARS';
  // Usar locale es-AR para ambos → ARS = "$ 1.234,56" · USD = "US$ 1.234,56"
  // (evita ambigüedad del "$" pelado cuando la moneda es USD)
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: cur,
    currencyDisplay: 'symbol',
  }).format(amount);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    // Si viene como YYYY-MM-DD, pin a medianoche local para evitar rollback de timezone
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    const d = isDateOnly ? new Date(`${dateStr}T00:00:00`) : new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  } catch {
    return dateStr;
  }
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  contado: 'Contado',
  '30_dias': '30 días',
  '60_dias': '60 días',
  '50_50': '50% anticipo, 50% contra entrega',
  financiado: 'Financiado',
};

const CONDICION_LABEL: Record<string, string> = {
  nuevo: 'Nuevo',
  usado: 'Usado',
  demo: 'Demo',
  reacondicionado: 'Reacondicionado',
  outlet: 'Outlet',
};

function prettyKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Formatea un valor de especificación a texto legible (sin llaves/comillas JSON).
// Objetos anidados -> "Clave: valor" por línea; arrays -> separados por coma.
// Filtra nulos/vacíos (incl. el string "null" que viene de la data vieja).
function formatSpecValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) {
    return v.map((x) => formatSpecValue(x)).filter(Boolean).join(', ');
  }
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => val !== null && val !== undefined && val !== '' && String(val).trim().toLowerCase() !== 'null')
      .map(([k, val]) => `${prettyKey(k)}: ${formatSpecValue(val)}`)
      .filter((line) => !line.endsWith(': '))
      .join('\n');
  }
  const s = String(v).trim();
  return s.toLowerCase() === 'null' ? '' : s;
}

function formatEspecificaciones(
  esp: Record<string, unknown> | unknown[] | null | undefined,
): [string, string][] {
  if (!esp || typeof esp !== 'object') return [];
  if (Array.isArray(esp)) {
    return esp
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map((v, i) => [`Item ${i + 1}`, formatSpecValue(v)] as [string, string])
      .filter(([, val]) => val !== '');
  }
  return Object.entries(esp)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => [prettyKey(k), formatSpecValue(v)] as [string, string])
    .filter(([, val]) => val !== '');
}

export async function generatePresupuestoEquipoPDF(
  presupuesto: PresupuestoEquipoData,
  orgId: string
): Promise<jsPDF> {
  const theme = await loadPdfTheme(orgId);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const rightX = pageWidth - margin;
  // Moneda efectiva = la del header del presupuesto. Los montos guardados
  // (precio_base / items / subtotal / total) están SIEMPRE en esa moneda: al cambiar
  // la moneda del presupuesto el form re-cotiza los precios, así que header y montos
  // quedan consistentes (ya no existe el caso "header en $ con líneas en US$"). En
  // presupuestos viejos el header coincidía con la moneda del catálogo, así que esto
  // no cambia nada para ellos. El desglose por moneda (esMixto) sigue para los pocos
  // presupuestos multi-moneda no convertidos.
  const monedaHeader = presupuesto.moneda || 'ARS';
  const moneda = monedaHeader;
  // Si el presupuesto mezcla monedas, los totales se muestran agrupados por moneda
  // (uno por cada una) en vez de un único total que no representaría a las dos.
  const totalesPorMoneda = presupuesto.totalesPorMoneda ?? [];
  const esMixto = totalesPorMoneda.length > 1;

  // ==========================================================================
  // COVER
  // ==========================================================================
  let y = drawHeader(doc, theme, undefined, { logoRight: true });

  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Presupuesto de Equipamiento', margin, y + 4);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${presupuesto.numero}`, margin, y + 13);

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

  y += 27;

  // Cliente
  drawSectionTitle(doc, theme, y, 'Cliente');
  y += 7;

  const cliNombre =
    presupuesto.cliente?.nombre_fantasia || presupuesto.cliente?.nombre || 'Sin cliente';
  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(cliNombre, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);

  const cliInfo: string[] = [];
  if (presupuesto.cliente?.cuit) cliInfo.push(`CUIT ${presupuesto.cliente.cuit}`);
  if (presupuesto.cliente?.direccion) cliInfo.push(presupuesto.cliente.direccion);
  if (cliInfo.length) doc.text(cliInfo.join('  ·  '), margin, y + 5);

  const emails = Array.isArray(presupuesto.cliente?.email)
    ? presupuesto.cliente?.email
    : presupuesto.cliente?.email
    ? [presupuesto.cliente.email]
    : [];
  const telefonos = Array.isArray(presupuesto.cliente?.telefono)
    ? presupuesto.cliente?.telefono
    : presupuesto.cliente?.telefono
    ? [presupuesto.cliente.telefono]
    : [];
  let cY = y;
  if (emails && emails.length) {
    doc.text(emails[0], rightX, cY, { align: 'right' });
    cY += 5;
  }
  if (telefonos && telefonos.length) {
    doc.text(telefonos[0], rightX, cY, { align: 'right' });
  }

  y += 14;

  // Resumen de equipos en cover
  if (presupuesto.equipos.length > 0) {
    drawSectionTitle(doc, theme, y, 'Equipamiento incluido');
    y += 7;

    const resumenRows = presupuesto.equipos.map((eq) => {
      const cant = presupuesto.equipoCantidades?.[eq.id] ?? 1;
      const nombre = [eq.marca, eq.modelo].filter(Boolean).join(' ') || 'Equipo';
      const cond = eq.condicion ? CONDICION_LABEL[eq.condicion] || eq.condicion : '';
      const precio = eq.precio_lista
        ? formatCurrency(Number(eq.precio_lista) * cant, eq.precio_lista_moneda || moneda)
        : '-';
      return [nombre, cond, cant.toString(), precio];
    });

    autoTable(doc, {
      startY: y,
      head: [['Equipo', 'Condición', 'Cant.', 'Precio lista']],
      body: resumenRows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
        textColor: PDF_COLORS.text,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: PDF_COLORS.muted,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30 },
        2: { cellWidth: 15, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        const { doc: d, cell, section, row } = data;
        if (section === 'head') {
          d.setDrawColor(...theme.branding.primaryColor);
          d.setLineWidth(0.4);
          d.line(cell.x, cell.y, cell.x + cell.width, cell.y);
          d.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        } else if (section === 'body' && row.index < resumenRows.length - 1) {
          d.setDrawColor(...PDF_COLORS.rule);
          d.setLineWidth(0.15);
          d.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Descripción comercial general (si hay)
  if (presupuesto.descripcion_comercial) {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = drawHeader(doc, theme, undefined, { logoRight: true });
    }
    drawSectionTitle(doc, theme, y, 'Descripción');
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    const lines = doc.splitTextToSize(presupuesto.descripcion_comercial, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 6;
  }

  // ==========================================================================
  // HERO INFERIOR COVER: total estimado + chips de "Qué incluye"
  // Aprovecha el espacio vacío de la cover y ancla el resumen comercial.
  // ==========================================================================
  const heroY = pageHeight - 70;
  if (y < heroY - 5) {
    const accent = theme.branding.primaryColor;

    // (Se quitó el recuadro rojo de "Inversión total estimada" de la portada
    //  a pedido; el total figura en el bloque de Totales al final.)

    // Chips "Qué incluye" (izquierda)
    const chips: string[] = [];
    if (presupuesto.incluye_instalacion) chips.push('Instalación');
    if (presupuesto.incluye_capacitacion) chips.push('Capacitación');
    if (presupuesto.garantia) {
      chips.push(
        presupuesto.garantia.toLowerCase().startsWith('sin')
          ? presupuesto.garantia
          : `Garantía ${presupuesto.garantia}`
      );
    }
    if (chips.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text('QUÉ INCLUYE', margin, heroY + 5);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      let chipY = heroY + 12;
      for (const chip of chips) {
        // Bullet circle
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.circle(margin + 1.5, chipY - 1.5, 1.2, 'F');
        doc.text(chip, margin + 5, chipY);
        chipY += 5.5;
      }
    }
  }

  // ==========================================================================
  // PÁGINA POR EQUIPO (hoja de producto)
  // ==========================================================================
  for (const eq of presupuesto.equipos) {
    doc.addPage();
    let ey = drawHeader(doc, theme, undefined, { logoRight: true });

    const nombre = [eq.marca, eq.modelo].filter(Boolean).join(' ') || 'Equipo';
    const cantidad = presupuesto.equipoCantidades?.[eq.id] ?? 1;

    doc.setTextColor(...PDF_COLORS.ink);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(nombre, margin, ey + 4);

    if (eq.tipo || eq.condicion) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.muted);
      const meta: string[] = [];
      if (eq.tipo) meta.push(eq.tipo);
      if (eq.condicion) meta.push(CONDICION_LABEL[eq.condicion] || eq.condicion);
      doc.text(meta.join('  ·  '), margin, ey + 10);
    }
    ey += 16;

    // Imagen grande a la izquierda, specs a la derecha
    const imgW = 70;
    const imgH = 50;
    const imgX = margin;
    const imgY = ey;
    if (eq.imagen_base64) {
      try {
        const fmt = eq.imagen_base64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        const data = eq.imagen_base64.includes(',')
          ? eq.imagen_base64.split(',')[1]
          : eq.imagen_base64;
        doc.addImage(`data:image/${fmt.toLowerCase()};base64,${data}`, fmt, imgX, imgY, imgW, imgH);
      } catch {
        // ignore image failure
      }
    } else {
      // placeholder
      doc.setDrawColor(...PDF_COLORS.rule);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, 'FD');
      doc.setTextColor(...PDF_COLORS.muted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Sin imagen', imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
    }

    // Descripción comercial a la derecha de la imagen
    const textX = imgX + imgW + 8;
    const textW = pageWidth - margin - textX;
    let ty = ey + 2;

    if (eq.descripcion_comercial) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.text);
      const lines = doc.splitTextToSize(eq.descripcion_comercial, textW);
      doc.text(lines.slice(0, 10), textX, ty);
      ty += Math.min(lines.length, 10) * 4.5;
    }

    // Precio destacado
    if (eq.precio_lista) {
      ty = Math.max(ty, imgY + imgH - 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...theme.branding.primaryColor);
      doc.text(
        formatCurrency(Number(eq.precio_lista), eq.precio_lista_moneda || moneda),
        textX,
        ty + 8
      );
      if (cantidad > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...PDF_COLORS.muted);
        doc.text(`× ${cantidad} unidades`, textX, ty + 13);
      }
    }

    ey = Math.max(ey + imgH + 8, ty + 16);

    // Especificaciones técnicas
    const specs = formatEspecificaciones(eq.especificaciones ?? null);
    if (specs.length > 0) {
      if (ey > pageHeight - 60) {
        doc.addPage();
        ey = drawHeader(doc, theme, undefined, { logoRight: true });
      }
      drawSectionTitle(doc, theme, ey, 'Especificaciones técnicas');
      ey += 5;

      autoTable(doc, {
        startY: ey,
        body: specs,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
          textColor: PDF_COLORS.text,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold', textColor: PDF_COLORS.muted },
          1: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          const { doc: d, cell, row, section } = data;
          if (section === 'body' && row.index < specs.length - 1) {
            d.setDrawColor(...PDF_COLORS.rule);
            d.setLineWidth(0.12);
            d.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
          }
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ey = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ==========================================================================
  // PÁGINA DE ACCESORIOS / SERVICIOS (si hay) — se une con Condiciones
  // ==========================================================================
  let accesoriosFinalY: number | null = null;
  if (presupuesto.accesorios.length > 0) {
    doc.addPage();
    let ay = drawHeader(doc, theme, undefined, { logoRight: true });

    doc.setTextColor(...PDF_COLORS.ink);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Accesorios y servicios', margin, ay + 4);
    ay += 12;

    const accRows = presupuesto.accesorios.map((it) => [
      `${it.descripcion}${it.es_opcional ? '   · opcional' : ''}`,
      it.cantidad.toString(),
      it.incluido_en_precio ? 'Incluido' : formatCurrency(it.precio_unitario, moneda),
      it.incluido_en_precio ? 'Incluido' : formatCurrency(it.subtotal, moneda),
    ]);

    autoTable(doc, {
      startY: ay,
      head: [['Concepto', 'Cant.', 'Precio unitario', 'Subtotal']],
      body: accRows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
        textColor: PDF_COLORS.text,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: PDF_COLORS.muted,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 18, halign: 'right' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        const { doc: d, cell, section, row } = data;
        if (section === 'head') {
          d.setDrawColor(...theme.branding.primaryColor);
          d.setLineWidth(0.4);
          d.line(cell.x, cell.y, cell.x + cell.width, cell.y);
          d.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        } else if (section === 'body' && row.index < accRows.length - 1) {
          d.setDrawColor(...PDF_COLORS.rule);
          d.setLineWidth(0.15);
          d.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accesoriosFinalY = (doc as any).lastAutoTable.finalY;
  }

  // ==========================================================================
  // CONDICIONES + TOTAL (misma página que accesorios si entra, sino nueva)
  // ==========================================================================
  let fy: number;
  // Necesitamos ~100mm para condiciones + totales + observaciones
  const needsNewPage = accesoriosFinalY === null || accesoriosFinalY > pageHeight - 110;
  if (needsNewPage) {
    doc.addPage();
    fy = drawHeader(doc, theme, undefined, { logoRight: true });
  } else {
    fy = accesoriosFinalY! + 14;
  }

  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Condiciones comerciales', margin, fy + 4);
  fy += 14;

  const condRows: [string, string][] = [];
  if (presupuesto.forma_pago) {
    if (presupuesto.forma_pago === 'financiado' && presupuesto.financiacion_cuotas) {
      const cuotas = Number(presupuesto.financiacion_cuotas) || 1;
      const interes = Number(presupuesto.interes_porcentaje) || 0;
      if (esMixto) {
        // Con monedas mezcladas no hay un único valor de cuota; mostramos solo el plan.
        condRows.push([
          'Forma de pago',
          `${cuotas} ${cuotas === 1 ? 'cuota' : 'cuotas'}${interes > 0 ? ` (interés ${interes}%)` : ''} — ver total por moneda`,
        ]);
      } else {
        const mon = moneda; // moneda efectiva (sigue a los equipos)
        const totalConInteres = presupuesto.total * (1 + interes / 100);
        const valorCuota = totalConInteres / cuotas;
        condRows.push([
          'Forma de pago',
          `${cuotas} ${cuotas === 1 ? 'cuota' : 'cuotas'} de ${formatCurrency(valorCuota, mon)}${interes > 0 ? ` (interés ${interes}%)` : ''}`,
        ]);
      }
    } else {
      condRows.push(['Forma de pago', FORMA_PAGO_LABEL[presupuesto.forma_pago] || presupuesto.forma_pago]);
    }
  }
  if (presupuesto.tiempo_entrega) condRows.push(['Tiempo de entrega', presupuesto.tiempo_entrega]);
  if (presupuesto.garantia) condRows.push(['Garantía', presupuesto.garantia]);
  condRows.push(['Instalación', presupuesto.incluye_instalacion ? 'Incluida' : 'No incluida']);
  condRows.push(['Capacitación', presupuesto.incluye_capacitacion ? 'Incluida' : 'No incluida']);
  if (presupuesto.validez_dias) condRows.push(['Validez de la oferta', `${presupuesto.validez_dias} días`]);
  if (presupuesto.fecha_vencimiento) condRows.push(['Válido hasta', formatDate(presupuesto.fecha_vencimiento)]);

  if (condRows.length > 0) {
    autoTable(doc, {
      startY: fy,
      body: condRows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        textColor: PDF_COLORS.text,
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', textColor: PDF_COLORS.muted },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        const { doc: d, cell, row, section } = data;
        if (section === 'body' && row.index < condRows.length - 1) {
          d.setDrawColor(...PDF_COLORS.rule);
          d.setLineWidth(0.12);
          d.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fy = (doc as any).lastAutoTable.finalY + 8;
  }

  // Totales
  const labelX = pageWidth - margin - 55;
  const valueX = pageWidth - margin;

  if (esMixto) {
    // Monedas mezcladas: un bloque Subtotal/IVA/Total por cada moneda, sin convertir.
    totalesPorMoneda.forEach((t, i) => {
      if (i > 0) fy += 3;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text('Subtotal', labelX, fy, { align: 'left' });
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(formatCurrency(t.subtotal, t.moneda), valueX, fy, { align: 'right' });
      fy += 5;

      if (t.iva > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.muted);
        doc.text('IVA', labelX, fy, { align: 'left' });
        doc.setTextColor(...PDF_COLORS.text);
        doc.text(formatCurrency(t.iva, t.moneda), valueX, fy, { align: 'right' });
        fy += 5;
      }

      doc.setDrawColor(...theme.branding.primaryColor);
      doc.setLineWidth(0.4);
      doc.line(labelX, fy, valueX, fy);
      fy += 5;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...theme.branding.primaryColor);
      doc.text(`TOTAL ${t.moneda}`, labelX, fy, { align: 'left' });
      doc.setTextColor(...PDF_COLORS.ink);
      doc.text(formatCurrency(t.total, t.moneda), valueX, fy, { align: 'right' });
      fy += 7;
    });
    fy += 1;
  } else {
  if (presupuesto.subtotal !== undefined) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text('Subtotal', labelX, fy, { align: 'left' });
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(formatCurrency(presupuesto.subtotal, moneda), valueX, fy, { align: 'right' });
    fy += 5;
  }

  if (presupuesto.descuento_monto && presupuesto.descuento_monto > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.muted);
    const dLabel = presupuesto.descuento_porcentaje
      ? `Descuento (${presupuesto.descuento_porcentaje}%)`
      : 'Descuento';
    doc.text(dLabel, labelX, fy, { align: 'left' });
    doc.setTextColor(220, 38, 38); // rojo para descuento
    doc.text(`- ${formatCurrency(presupuesto.descuento_monto, moneda)}`, valueX, fy, { align: 'right' });
    fy += 5;
  }

  if (presupuesto.iva && presupuesto.iva > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.muted);
    // Mostramos la alícuota cuando coincide con una estándar (0/10,5/21/27%).
    // En multi-equipo con alícuotas mezcladas, iva/subtotal da un valor intermedio → "IVA".
    const ivaPctRaw = presupuesto.subtotal ? (presupuesto.iva / presupuesto.subtotal) * 100 : 0;
    const ivaStd = [10.5, 21, 27, 0].find((a) => Math.abs(a - ivaPctRaw) < 0.1);
    const ivaLabel = ivaStd != null
      ? `IVA (${ivaStd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%)`
      : 'IVA';
    doc.text(ivaLabel, labelX, fy, { align: 'left' });
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(formatCurrency(presupuesto.iva, moneda), valueX, fy, { align: 'right' });
    fy += 5;
  }

  doc.setDrawColor(...theme.branding.primaryColor);
  doc.setLineWidth(0.4);
  doc.line(labelX, fy, valueX, fy);
  fy += 5;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.branding.primaryColor);
  doc.text('TOTAL', labelX, fy, { align: 'left' });
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text(formatCurrency(presupuesto.total, moneda), valueX, fy, { align: 'right' });

  fy += 8;
  }

  // Documentos extra adjuntados desde la biblioteca (normativas, planos, ofertas
  // especiales que el cliente pidió aparte del folleto/ficha estándar).
  if (presupuesto.documentos && presupuesto.documentos.length > 0) {
    const docs = presupuesto.documentos.filter((d) => d.titulo && d.link);
    if (docs.length > 0) {
      const docTitleH = 6;
      const docLineH = 4.6;
      const docDescH = 3.5;
      const needed =
        docTitleH +
        docs.reduce((s, d) => s + docLineH + (d.descripcion ? docDescH : 0), 0) +
        4;
      if (fy + needed > pageHeight - 30) {
        doc.addPage();
        fy = drawHeader(doc, theme, undefined, { logoRight: true });
      }
      drawSectionTitle(doc, theme, fy, 'Documentación adicional');
      fy += docTitleH;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      for (const d of docs) {
        doc.setTextColor(...PDF_COLORS.text);
        const bullet = `• ${d.titulo}`;
        doc.text(bullet, margin, fy);
        // Link clickeable a la derecha del título
        doc.setTextColor(37, 99, 235);
        const linkLabel = '[ver documento]';
        const titleWidth = doc.getTextWidth(bullet);
        doc.textWithLink(linkLabel, margin + titleWidth + 3, fy, { url: d.link });
        fy += docLineH;
        if (d.descripcion) {
          doc.setFontSize(8);
          doc.setTextColor(...PDF_COLORS.muted);
          const descLines = doc.splitTextToSize(d.descripcion, pageWidth - margin * 2 - 4);
          doc.text(descLines, margin + 4, fy);
          fy += descLines.length * docDescH;
          doc.setFontSize(9);
        }
      }
      fy += 4;
    }
  }

  // Observaciones / términos — intentar caber en misma página que totales (usando el ancho completo).
  if (presupuesto.observaciones || presupuesto.terminos_condiciones) {
    const obsTxt = presupuesto.observaciones || '';
    const trmTxt = presupuesto.terminos_condiciones || '';
    // Usamos el ancho completo (no el de la columna derecha de totales)
    const fullWidth = pageWidth - margin * 2;
    const obsLines = obsTxt ? doc.splitTextToSize(obsTxt, fullWidth) : [];
    const trmLines = trmTxt ? doc.splitTextToSize(trmTxt, fullWidth) : [];
    const obsH = obsLines.length ? 6 + obsLines.length * 3.8 + 3 : 0;
    const trmH = trmLines.length ? 6 + trmLines.length * 3.2 + 1 : 0;
    const needed = obsH + trmH;

    // Footer empieza en pageHeight - 28. Dejo 2mm de padding.
    if (fy + needed > pageHeight - 30) {
      doc.addPage();
      fy = drawHeader(doc, theme, undefined, { logoRight: true });
    }
    if (obsLines.length) {
      drawSectionTitle(doc, theme, fy, 'Observaciones');
      fy += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(obsLines, margin, fy);
      fy += obsLines.length * 3.8 + 3;
    }
    if (trmLines.length) {
      drawSectionTitle(doc, theme, fy, 'Términos y condiciones');
      fy += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(trmLines, margin, fy);
    }
  }

  // ==========================================================================
  // FOOTER
  // ==========================================================================
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
