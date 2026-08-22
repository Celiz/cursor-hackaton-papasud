import { z } from 'zod'
import { query } from '@locus/db'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { register } from '../registry'
import type { CatalogEntry, ActionResult } from '../types'

// Simple branding constants (Uno Electromedicina)
const BRAND = {
  name: 'UNO ELECTROMEDICINA',
  address: 'Chaco 801, Mar del Plata - Buenos Aires, Argentina',
  phone: '+54 223 473-9018',
  email: 'contacto@papasud.com.ar',
  cuit: '20-20490460-0',
  logo: 'https://i.imgur.com/qCfPnBE.png',
}

// Cache logo base64
let logoCache: string | null = null
async function loadLogo(): Promise<string | null> {
  if (logoCache) return logoCache
  try {
    const res = await fetch(BRAND.logo)
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    const ct = res.headers.get('content-type') || 'image/png'
    logoCache = `data:${ct};base64,${b64}`
    return logoCache
  } catch {
    return null
  }
}

const COLOR = {
  primary: [139, 92, 246] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
}

const entry: CatalogEntry = {
  id: 'orden_servicio_pdf',
  type: 'action',
  description:
    'Genera y envía el PDF de una orden de servicio por Telegram. Param opcional: servicio_id (si no se pasa, usa el último).',
  params: z.object({
    servicio_id: z.string().optional(),
  }),
  async execute(orgId, params): Promise<ActionResult> {
    let servicioId = params.servicio_id

    if (!servicioId) {
      const latest = await query<{ id: string }>(
        `SELECT id FROM servicios WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [orgId]
      )
      if (latest.rows.length === 0) {
        return { type: 'text', message: 'No hay servicios registrados.' }
      }
      servicioId = latest.rows[0].id
    }

    // Support short IDs (first 8 chars) — resolve to full UUID
    if (servicioId.length < 36) {
      const match = await query<{ id: string }>(
        `SELECT id FROM servicios WHERE org_id = $1 AND id::text ILIKE $2 LIMIT 1`,
        [orgId, servicioId.toLowerCase() + '%']
      )
      if (match.rows.length === 0) {
        return { type: 'text', message: `No encontré servicio con ID ${servicioId}.` }
      }
      servicioId = match.rows[0].id
    }

    const result = await query<Record<string, any>>(`
      SELECT
        s.*,
        c.nombre AS cliente_nombre,
        c.nombre_fantasia AS cliente_nombre_fantasia,
        c.telefono::text AS cliente_telefono,
        c.datos_contacto AS cliente_datos_contacto,
        e.marca AS equipo_marca,
        e.modelo AS equipo_modelo,
        e.tipo AS equipo_tipo,
        eu.numero_serie
      FROM servicios s
      LEFT JOIN clientes c ON c.id = s.cliente_id
      LEFT JOIN equipos_unidades eu ON eu.id = s.equipo_id
      LEFT JOIN equipos e ON e.id = eu.equipo_id
      WHERE s.id = $1 AND s.org_id = $2
    `, [servicioId, orgId])

    if (result.rows.length === 0) {
      return { type: 'text', message: 'Servicio no encontrado.' }
    }

    const s = result.rows[0]
    const shortId = s.id.slice(0, 8).toUpperCase()
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const margin = 20
    const centerX = pageWidth / 2

    // --- HEADER ---
    let y = 15

    // Logo
    const logo = await loadLogo()
    if (logo) {
      const logoW = 30
      const logoH = 30
      doc.addImage(logo, 'PNG', centerX - logoW / 2, y, logoW, logoH)
      y += logoH + 5
    }

    doc.setTextColor(...COLOR.text)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(BRAND.name, centerX, y, { align: 'center' })

    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR.muted)
    doc.text(BRAND.address, centerX, y, { align: 'center' })
    y += 4
    doc.text(`Tel: ${BRAND.phone} | Email: ${BRAND.email}`, centerX, y, { align: 'center' })
    y += 4
    doc.text(`CUIT: ${BRAND.cuit}`, centerX, y, { align: 'center' })

    y += 10

    // --- TITLE ---
    doc.setTextColor(...COLOR.text)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Orden de Servicio', margin, y)

    doc.setFontSize(12)
    doc.setTextColor(...COLOR.primary)
    doc.text(`N° ${shortId}`, pageWidth - margin, y, { align: 'right' })

    y += 7
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR.muted)
    const fecha = s.fecha
      ? new Date(s.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date(s.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.text(fecha, margin, y)

    y += 5

    // Separator
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)

    y += 10

    // --- CLIENT & EQUIPMENT (two columns) ---
    const colWidth = (pageWidth - margin * 2 - 10) / 2
    const col1X = margin
    const col2X = margin + colWidth + 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR.primary)
    doc.text('Cliente', col1X, y)
    doc.text('Equipo', col2X, y)

    y += 7

    doc.setTextColor(...COLOR.text)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const clienteNombre = s.cliente_nombre_fantasia || s.cliente_nombre || '-'
    doc.text(clienteNombre.toUpperCase(), col1X, y)
    doc.text(s.equipo_tipo || '-', col2X, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.muted)

    if (s.cliente_telefono) {
      doc.text(`Tel: ${s.cliente_telefono}`, col1X, y)
    }
    doc.text(`Marca: ${s.equipo_marca || '-'}`, col2X, y)

    y += 5
    doc.text(`Modelo: ${s.equipo_modelo || '-'}`, col2X, y)

    y += 5
    doc.text(`N/S: ${s.numero_serie || '-'}`, col2X, y)

    y += 10

    // Separator
    doc.setDrawColor(229, 231, 235)
    doc.line(margin, y, pageWidth - margin, y)

    y += 8

    // --- SERVICE DETAILS ---
    const details: [string, string][] = [
      ['Estado', s.estado || '-'],
      ['Técnico', s.tecnico || '-'],
    ]
    if (s.tipo_servicio) details.push(['Tipo de servicio', s.tipo_servicio])
    if (s.falla_declarada) details.push(['Falla reportada', s.falla_declarada])
    if (s.diagnostico) details.push(['Diagnóstico', s.diagnostico])
    if (s.accesorios_entrantes) details.push(['Accesorios', s.accesorios_entrantes])
    if (s.estado_contable) details.push(['Estado contable', s.estado_contable])

    const costoTotal = Number(s.costo_total || s.precio || 0)
    if (costoTotal > 0) {
      details.push(['Total', `$${costoTotal.toLocaleString('es-AR')}`])
    }

    autoTable(doc, {
      startY: y,
      head: [['Campo', 'Detalle']],
      body: details,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: COLOR.primary, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
      },
    })

    // Generate buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return {
      type: 'document',
      document: pdfBuffer,
      filename: `orden-servicio-${shortId}.pdf`,
      caption: `Orden de Servicio #${shortId} — ${clienteNombre}`,
    }
  },
}

register(entry)
export default entry
