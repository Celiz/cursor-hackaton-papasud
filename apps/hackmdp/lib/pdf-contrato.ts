import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EquipoContrato } from './types';
import { formatCurrency, formatDateShort } from './branding';
import { loadPdfTheme, drawHeader, drawFooter, drawSectionTitle, PDF_COLORS, type PdfThemeConfig } from './pdf-theme';

const tipoLabels: Record<string, string> = {
  comodato: 'Comodato',
  alquiler: 'Alquiler',
  demo: 'Demo',
  prestamo: 'Préstamo',
};

const estadoLabels: Record<string, string> = {
  borrador: 'Borrador',
  activo: 'Activo',
  vencido: 'Vencido',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

function addSection(doc: jsPDF, config: PdfThemeConfig, y: number, title: string): number {
  return drawSectionTitle(doc, config, y, title);
}

function addField(doc: jsPDF, y: number, label: string, value: string, x = 14): number {
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(label, x, y);
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(value || '-', x, y + 4);
  return y + 10;
}

export async function generateContratoPDF(contrato: EquipoContrato, orgId: string): Promise<jsPDF> {
  const theme = await loadPdfTheme(orgId);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  let y = drawHeader(doc, theme, `Contrato de ${tipoLabels[contrato.tipo] || contrato.tipo}`);

  // Estado
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(`Estado: ${estadoLabels[contrato.estado] || contrato.estado}`, pageWidth - 14, y, { align: 'right' });
  y += 4;

  // Equipo
  const mid = pageWidth / 2;
  y = addSection(doc, theme, y, 'Equipo');
  y = addField(doc, y, 'Código', contrato.equipo_unidad?.codigo || '-');
  addField(doc, y - 10, 'N° Serie', contrato.equipo_unidad?.numero_serie || '-', mid);
  y = addField(doc, y, 'Marca / Modelo',
    `${contrato.equipo_unidad?.equipo?.marca || ''} ${contrato.equipo_unidad?.equipo?.modelo || ''}`.trim() || '-');
  addField(doc, y - 10, 'Tipo', contrato.equipo_unidad?.equipo?.tipo || '-', mid);

  // Cliente
  y = addSection(doc, theme, y + 2, 'Cliente');
  y = addField(doc, y, 'Razón Social', contrato.cliente?.razon_social || contrato.cliente?.nombre || '-');
  addField(doc, y - 10, 'CUIT/DNI', contrato.cliente?.identificador_unico || '-', mid);

  // Detalles del Contrato
  y = addSection(doc, theme, y + 2, 'Detalles del Contrato');
  y = addField(doc, y, 'Tipo', tipoLabels[contrato.tipo] || contrato.tipo);
  addField(doc, y - 10, 'Fecha Inicio', formatDateShort(contrato.fecha_inicio), mid);
  if (contrato.fecha_fin) {
    y = addField(doc, y, 'Fecha Fin', formatDateShort(contrato.fecha_fin));
    if (contrato.duracion_meses) {
      addField(doc, y - 10, 'Duración', `${contrato.duracion_meses} meses`, mid);
    }
  }
  y = addField(doc, y, 'Renovación Automática', contrato.renovacion_automatica ? 'Sí' : 'No');
  addField(doc, y - 10, 'Mantenimiento Incluido', contrato.requiere_mantenimiento_incluido ? 'Sí' : 'No', mid);

  // Información Financiera
  y = addSection(doc, theme, y + 2, 'Información Financiera');
  y = addField(doc, y, 'Costo Mensual',
    contrato.costo_mensual > 0 ? formatCurrency(contrato.costo_mensual) : 'Sin costo');
  addField(doc, y - 10, 'Costo Total',
    contrato.costo_total > 0 ? formatCurrency(contrato.costo_total) : 'Sin costo', mid);

  // Condiciones Especiales
  if (contrato.condiciones_especiales) {
    y = addSection(doc, theme, y + 2, 'Condiciones Especiales');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    const lines = doc.splitTextToSize(contrato.condiciones_especiales, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // Historial de Precios
  if (contrato.historial_precios && contrato.historial_precios.length > 0) {
    y = addSection(doc, theme, y + 2, 'Historial de Precios');
    const precios = [...contrato.historial_precios].sort((a, b) => b.periodo.localeCompare(a.periodo));
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    autoTable(doc, {
      startY: y,
      head: [['Período', 'Monto']],
      body: precios.map(p => {
        const [year, month] = p.periodo.split('-');
        return [`${monthNames[parseInt(month) - 1]} ${year}`, formatCurrency(p.monto)];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: theme.branding.primaryColor, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  drawFooter(doc, theme);

  return doc;
}

export async function downloadContratoPDF(contrato: EquipoContrato, orgId: string) {
  const doc = await generateContratoPDF(contrato, orgId);
  const codigo = contrato.equipo_unidad?.codigo || contrato.id.slice(0, 8);
  doc.save(`contrato-${codigo}-${contrato.tipo}.pdf`);
}

export async function printContratoPDF(contrato: EquipoContrato, orgId: string) {
  const doc = await generateContratoPDF(contrato, orgId);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.print();
    };
  }
}
