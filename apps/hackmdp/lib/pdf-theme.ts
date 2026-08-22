import jsPDF from 'jspdf';
import { getOrgBranding, type OrgBranding } from './org-branding';

// Paleta neutra compartida — el accent viene de branding.primaryColor
export const PDF_COLORS = {
  ink: [20, 20, 20] as [number, number, number],
  text: [45, 45, 45] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  rule: [200, 200, 200] as [number, number, number],
};

export interface PdfThemeConfig {
  branding: OrgBranding;
  tagline?: string;
}

export interface FooterFirma {
  nombre_completo: string;
  cargo?: string;
  email?: string;
  telefono_directo?: string;
}

/**
 * Carga branding de la org y arma el config para PDF.
 *
 * En el servidor llama a getOrgBranding (query a DB + logo del filesystem).
 * En el navegador NO se puede consultar la DB (pg necesita un socket TCP),
 * así que se trae el branding por API. Esto permite generar PDFs del lado
 * del cliente (botones "Descargar PDF", envío desde el diálogo de facturar).
 */
export async function loadPdfTheme(orgId: string): Promise<PdfThemeConfig> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/org-branding');
    if (!res.ok) {
      throw new Error('No se pudo cargar el branding de la organización');
    }
    const branding = (await res.json()) as OrgBranding;
    return { branding };
  }

  const branding = await getOrgBranding(orgId);
  return { branding };
}

/**
 * Header sobrio: logo izquierda + nombre en accent + tagline gris + filete fino.
 * Retorna Y donde empieza el contenido.
 */
export function drawHeader(
  doc: jsPDF,
  config: PdfThemeConfig,
  title?: string,
  opts?: { logoRight?: boolean }
): number {
  const pageWidth = doc.internal.pageSize.width;
  const accent = config.branding.primaryColor;
  const margin = 20;
  const topY = 18;
  const logoRight = opts?.logoRight ?? false;

  // Logo: por defecto pequeño a la izquierda; con logoRight va chiquito
  // arriba a la derecha (membrete) y el nombre queda al margen izquierdo.
  let textX = margin;
  if (config.branding.logoBase64) {
    try {
      if (logoRight) {
        const size = 15;
        doc.addImage(config.branding.logoBase64, 'PNG', pageWidth - margin - size, topY - 2, size, size);
      } else {
        doc.addImage(config.branding.logoBase64, 'PNG', margin, topY - 2, 20, 20);
        textX = margin + 26;
      }
    } catch {
      // continuar sin logo
    }
  }

  // Nombre en accent color
  doc.setTextColor(...accent);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(config.branding.nombre, textX, topY + 5);

  // Tagline gris
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  const tagline = config.tagline || config.branding.direccion || '';
  if (tagline) {
    doc.text(tagline, textX, topY + 11);
  }

  // Filete accent como separador
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.6);
  const ruleY = topY + (tagline ? 18 : 12);
  doc.line(margin, ruleY, pageWidth - margin, ruleY);

  // Título del documento (si se pasa)
  let contentY = ruleY + 8;
  if (title) {
    doc.setTextColor(...PDF_COLORS.ink);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(title, margin, contentY);
    contentY += 6;
  }

  return contentY;
}

/**
 * Footer sobrio en todas las páginas.
 * Con firma: nombre/cargo izquierda, contacto derecha.
 * Sin firma: datos institucionales centrados.
 */
export function drawFooter(
  doc: jsPDF,
  config: PdfThemeConfig,
  firma?: FooterFirma
): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const accent = config.branding.primaryColor;
  const margin = 20;

  const contactParts: string[] = [];
  if (config.branding.direccion) contactParts.push(config.branding.direccion);
  if (config.branding.telefono) contactParts.push(config.branding.telefono);
  if (config.branding.email) contactParts.push(config.branding.email);
  const institucional = contactParts.join('  ·  ') || config.branding.nombre;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Filete accent
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);

    const topLine = pageHeight - 22;

    if (firma?.nombre_completo) {
      // Nombre del firmante
      doc.setTextColor(...PDF_COLORS.ink);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(firma.nombre_completo, margin, topLine);

      // Cargo
      if (firma.cargo) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.muted);
        doc.text(firma.cargo, margin, topLine + 4);
      }

      // Contacto del firmante a la derecha
      const firmaContacto: string[] = [];
      if (firma.telefono_directo) firmaContacto.push(firma.telefono_directo);
      if (firma.email) firmaContacto.push(firma.email);
      if (firmaContacto.length) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.text);
        doc.text(firmaContacto.join('  ·  '), pageWidth - margin, topLine, { align: 'right' });
      }

      // Institucional abajo derecha
      doc.setFontSize(7);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(institucional, pageWidth - margin, topLine + 4, { align: 'right' });
    } else {
      // Sin firma: datos centrados
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(institucional, pageWidth / 2, topLine, { align: 'center' });

      if (config.branding.cuit) {
        doc.setFontSize(7);
        doc.text(`CUIT: ${config.branding.cuit}`, pageWidth / 2, topLine + 4, { align: 'center' });
      }
    }

    // Página (sin timestamp — la fecha de emisión ya está en la cover)
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }
}

/**
 * Título de sección: texto en accent, uppercase, con filete neutro fino debajo.
 */
export function drawSectionTitle(
  doc: jsPDF,
  config: PdfThemeConfig,
  y: number,
  title: string
): number {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  doc.setTextColor(...config.branding.primaryColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), margin, y);
  doc.setDrawColor(...PDF_COLORS.rule);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
  return y + 6;
}

/**
 * Config de autoTable con colores de la org.
 */
export function getTableTheme(config: PdfThemeConfig) {
  return {
    headStyles: {
      fillColor: config.branding.primaryColor,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248] as [number, number, number],
    },
    styles: {
      fontSize: 9,
      textColor: PDF_COLORS.text,
      cellPadding: 3,
    },
    theme: 'striped' as const,
  };
}
