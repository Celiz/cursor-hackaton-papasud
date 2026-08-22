import type { InvoiceData, InvoiceLineItem, TaxBreakdownLine } from '../../types'
import { ES_TAX_RATES } from './tax-rates'

export interface SpanishInvoicePdfOptions {
  invoiceNumber: string // e.g. "FA-2026-000001"
  orgLogo?: string // base64 data URI
}

// ---------------------------------------------------------------------------
// Spanish number / currency formatting
// ---------------------------------------------------------------------------

/** Format number Spanish-style: 1.760,00 */
function fmtNumber(n: number, decimals = 2): string {
  const fixed = Math.abs(n).toFixed(decimals)
  const [int, dec] = fixed.split('.')
  const intWithDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (n < 0 ? '-' : '') + intWithDots + ',' + dec
}

/** Format EUR amount: 1.760,00 € */
function fmtEur(n: number): string {
  return fmtNumber(n) + ' \u20AC'
}

/** Format date as DD/MM/YYYY */
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ---------------------------------------------------------------------------
// Resolve invoice type label
// ---------------------------------------------------------------------------

function invoiceTypeLabel(type: string): string {
  switch (type) {
    case 'rectificativa':
      return 'FACTURA RECTIFICATIVA'
    case 'proforma':
      return 'FACTURA PROFORMA'
    default:
      return 'FACTURA'
  }
}

// ---------------------------------------------------------------------------
// Compute tax breakdown from line items if not provided
// ---------------------------------------------------------------------------

function computeTaxBreakdown(items: InvoiceLineItem[]): TaxBreakdownLine[] {
  const map = new Map<string, TaxBreakdownLine>()

  for (const item of items) {
    const rate = ES_TAX_RATES.find((r) => r.id === item.taxRateId)
    const pct = rate?.rate ?? 0
    const label = rate?.label ?? `IVA ${pct}%`
    const lineSubtotal = item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100)

    const existing = map.get(item.taxRateId)
    if (existing) {
      existing.base += lineSubtotal
      existing.amount += lineSubtotal * (pct / 100)
    } else {
      map.set(item.taxRateId, {
        taxRateId: item.taxRateId,
        label,
        rate: pct,
        base: lineSubtotal,
        amount: lineSubtotal * (pct / 100),
      })
    }
  }

  return Array.from(map.values())
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const PRIMARY: [number, number, number] = [41, 65, 122] // dark blue
const HEADER_BG: [number, number, number] = [41, 65, 122]
const HEADER_TEXT: [number, number, number] = [255, 255, 255]
const LIGHT_BG: [number, number, number] = [245, 247, 250]
const TEXT_DARK: [number, number, number] = [33, 33, 33]
const TEXT_GRAY: [number, number, number] = [120, 120, 120]

// ---------------------------------------------------------------------------
// Main PDF generator
// ---------------------------------------------------------------------------

export async function generateSpanishInvoicePdf(
  data: InvoiceData,
  options: SpanishInvoicePdfOptions,
): Promise<Uint8Array> {
  // Dynamic import for Node.js compatibility
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')

  // jspdf-autotable side-effects attach to jsPDF prototype
  // Some bundlers export default, others export named — handle both
  if (typeof autoTableModule === 'function') {
    ;(autoTableModule as any)(jsPDF)
  } else if (typeof (autoTableModule as any).default === 'function') {
    ;(autoTableModule as any).default(jsPDF)
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ---- Helper to set font ----
  const setFont = (style: 'normal' | 'bold', size: number, color: [number, number, number] = TEXT_DARK) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }

  // =========================================================================
  // HEADER
  // =========================================================================

  // Logo (if provided as base64 data URI)
  if (options.orgLogo) {
    try {
      doc.addImage(options.orgLogo, 'PNG', margin, y, 35, 18)
    } catch {
      // Silently skip if logo fails
    }
  }

  // Invoice type label — top right
  const typeLabel = invoiceTypeLabel(data.type)
  setFont('bold', 20, PRIMARY)
  doc.text(typeLabel, pageWidth - margin, y + 6, { align: 'right' })

  // Invoice number and date
  setFont('normal', 10, TEXT_GRAY)
  doc.text(`N.º ${options.invoiceNumber}`, pageWidth - margin, y + 13, { align: 'right' })
  doc.text(`Fecha: ${fmtDate(data.date)}`, pageWidth - margin, y + 18, { align: 'right' })

  y += 28

  // Separator line
  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(0.7)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // =========================================================================
  // EMITTER & RECEIVER BLOCKS
  // =========================================================================

  const colWidth = (contentWidth - 10) / 2 // 10mm gap between columns

  // -- Emitter (left) --
  const emitterX = margin
  setFont('bold', 7, PRIMARY)
  doc.text('EMISOR', emitterX, y)
  y += 4

  setFont('bold', 10, TEXT_DARK)
  doc.text(data.emitter.name, emitterX, y)
  y += 5

  setFont('normal', 9, TEXT_GRAY)
  doc.text(`NIF/CIF: ${data.emitter.taxId}`, emitterX, y)
  y += 4

  if (data.emitter.address) {
    const emitterAddr = doc.splitTextToSize(data.emitter.address, colWidth) as string[]
    for (const line of emitterAddr) {
      doc.text(line, emitterX, y)
      y += 4
    }
  }

  // -- Receiver (right) --
  const receiverX = margin + colWidth + 10
  let ry = y - (data.emitter.address ? 13 + (doc.splitTextToSize(data.emitter.address, colWidth) as string[]).length * 4 - 4 : 13)

  setFont('bold', 7, PRIMARY)
  doc.text('CLIENTE', receiverX, ry)
  ry += 4

  setFont('bold', 10, TEXT_DARK)
  doc.text(data.receiver.name, receiverX, ry)
  ry += 5

  setFont('normal', 9, TEXT_GRAY)
  doc.text(`NIF/CIF: ${data.receiver.taxId}`, receiverX, ry)
  ry += 4

  if (data.receiver.address) {
    const receiverAddr = doc.splitTextToSize(data.receiver.address, colWidth) as string[]
    for (const line of receiverAddr) {
      doc.text(line, receiverX, ry)
      ry += 4
    }
  }

  // Take the larger y
  y = Math.max(y, ry) + 8

  // =========================================================================
  // LINE ITEMS TABLE
  // =========================================================================

  const lineRows = data.items.map((item: InvoiceLineItem) => {
    const rate = ES_TAX_RATES.find((r) => r.id === item.taxRateId)
    const pct = rate?.rate ?? 0
    const lineSubtotal = item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100)
    return [
      item.description,
      fmtNumber(item.quantity, 2),
      fmtEur(item.unitPrice),
      `${pct}%`,
      fmtEur(lineSubtotal),
    ]
  })

  ;(doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Concepto', 'Cantidad', 'Precio unitario', '% IVA', 'Subtotal']],
    body: lineRows,
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_BG,
      textColor: HEADER_TEXT,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: TEXT_DARK,
    },
    alternateRowStyles: {
      fillColor: LIGHT_BG,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 30 },
    },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // =========================================================================
  // TAX BREAKDOWN TABLE (Desglose IVA)
  // =========================================================================

  const breakdown = data.taxBreakdown ?? computeTaxBreakdown(data.items)

  if (breakdown.length > 0) {
    setFont('bold', 10, PRIMARY)
    doc.text('Desglose IVA', margin, y)
    y += 4

    const taxRows = breakdown.map((tb) => [
      tb.label,
      fmtEur(tb.base),
      fmtEur(tb.amount),
    ])

    // Totals row
    const totalBase = breakdown.reduce((s, tb) => s + tb.base, 0)
    const totalIva = breakdown.reduce((s, tb) => s + tb.amount, 0)
    taxRows.push(['Total', fmtEur(totalBase), fmtEur(totalIva)])

    ;(doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Tipo IVA', 'Base imponible', 'Cuota IVA']],
      body: taxRows,
      theme: 'grid',
      headStyles: {
        fillColor: HEADER_BG,
        textColor: HEADER_TEXT,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: TEXT_DARK,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 40 },
        2: { halign: 'right', cellWidth: 40 },
      },
      didParseCell: (hookData: any) => {
        // Bold the last row (totals)
        if (hookData.section === 'body' && hookData.row.index === taxRows.length - 1) {
          hookData.cell.styles.fontStyle = 'bold'
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // =========================================================================
  // TOTALS
  // =========================================================================

  const totalsX = pageWidth - margin - 65
  const valuesX = pageWidth - margin

  setFont('normal', 10, TEXT_GRAY)
  doc.text('Subtotal (sin IVA):', totalsX, y, { align: 'left' })
  setFont('normal', 10, TEXT_DARK)
  doc.text(fmtEur(data.subtotal), valuesX, y, { align: 'right' })
  y += 6

  setFont('normal', 10, TEXT_GRAY)
  doc.text('Total IVA:', totalsX, y, { align: 'left' })
  setFont('normal', 10, TEXT_DARK)
  doc.text(fmtEur(data.totalTax), valuesX, y, { align: 'right' })
  y += 7

  // Bold total
  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(0.5)
  doc.line(totalsX - 2, y - 2, pageWidth - margin, y - 2)

  setFont('bold', 13, PRIMARY)
  doc.text('TOTAL:', totalsX, y + 3, { align: 'left' })
  doc.text(fmtEur(data.total), valuesX, y + 3, { align: 'right' })
  y += 14

  // =========================================================================
  // FOOTER
  // =========================================================================

  // Notes
  if (data.notes) {
    setFont('bold', 9, TEXT_DARK)
    doc.text('Observaciones:', margin, y)
    y += 5
    setFont('normal', 9, TEXT_GRAY)
    const noteLines = doc.splitTextToSize(data.notes, contentWidth) as string[]
    for (const line of noteLines) {
      doc.text(line, margin, y)
      y += 4
    }
    y += 4
  }

  // Legal footer at bottom of page
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerY = pageHeight - 12

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

  setFont('normal', 7, TEXT_GRAY)
  doc.text(
    'Factura emitida conforme a la legislaci\u00F3n vigente.',
    pageWidth / 2,
    footerY,
    { align: 'center' },
  )

  // =========================================================================
  // Output
  // =========================================================================

  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}
