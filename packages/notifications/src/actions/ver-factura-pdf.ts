import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'ver_factura',
  type: 'action',
  description:
    'Ver detalle de una factura (comprobante). Devuelve resumen con items. Param requerido: comprobante_id.',
  params: z.object({
    comprobante_id: z.string().uuid(),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { comprobante_id } = params

    const compSql = `
      SELECT
        c.tipo,
        c.punto_venta,
        c.numero,
        c.fecha,
        c.fecha_vto_pago,
        c.cliente_nombre,
        c.cliente_doc_tipo,
        c.cliente_doc_nro,
        c.imp_neto,
        c.imp_iva,
        c.imp_total,
        c.estado,
        c.cae,
        c.cae_vto,
        c.notas
      FROM comprobantes c
      WHERE c.id = $1 AND c.org_id = $2
    `

    const comp = await query<{
      tipo: string
      punto_venta: number
      numero: number
      fecha: string
      fecha_vto_pago: string | null
      cliente_nombre: string
      cliente_doc_tipo: string
      cliente_doc_nro: string
      imp_neto: string
      imp_iva: string
      imp_total: string
      estado: string
      cae: string | null
      cae_vto: string | null
      notas: string | null
    }>(compSql, [comprobante_id, orgId])

    if (comp.rows.length === 0) {
      return { type: 'text', message: '\u274C Comprobante no encontrado.' }
    }

    const c = comp.rows[0]
    const pv = String(c.punto_venta).padStart(4, '0')
    const nro = String(c.numero).padStart(8, '0')

    const itemsSql = `
      SELECT
        ci.descripcion,
        ci.cantidad,
        ci.precio_unitario,
        ci.alicuota_iva,
        ci.subtotal
      FROM comprobante_items ci
      WHERE ci.comprobante_id = $1
      ORDER BY ci.created_at
    `

    const items = await query<{
      descripcion: string
      cantidad: string
      precio_unitario: string
      alicuota_iva: string
      subtotal: string
    }>(itemsSql, [comprobante_id])

    const itemLines = items.rows.map((it, i) => {
      const cant = Number(it.cantidad)
      const precio = Number(it.precio_unitario)
      const sub = Number(it.subtotal)
      return `  ${i + 1}. ${it.descripcion}\n     ${cant} x $${precio.toLocaleString('es-AR')} = $${sub.toLocaleString('es-AR')} (IVA ${it.alicuota_iva}%)`
    })

    const fecha = new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-AR')
    const vto = c.fecha_vto_pago
      ? new Date(c.fecha_vto_pago + 'T12:00:00').toLocaleDateString('es-AR')
      : '-'
    const caeInfo = c.cae ? `CAE: ${c.cae} (vto: ${c.cae_vto})` : 'Sin CAE'

    const msg = [
      `\u{1F9FE} Factura ${c.tipo} ${pv}-${nro}`,
      `Fecha: ${fecha} | Estado: ${c.estado}`,
      `Cliente: ${c.cliente_nombre} (${c.cliente_doc_tipo}: ${c.cliente_doc_nro})`,
      c.fecha_vto_pago ? `Vto. pago: ${vto}` : null,
      '',
      'Items:',
      ...itemLines,
      '',
      `Neto: $${Number(c.imp_neto).toLocaleString('es-AR')}`,
      `IVA: $${Number(c.imp_iva).toLocaleString('es-AR')}`,
      `Total: $${Number(c.imp_total).toLocaleString('es-AR')}`,
      '',
      caeInfo,
      c.notas ? `Notas: ${c.notas}` : null,
    ]
      .filter((l) => l !== null)
      .join('\n')

    return { type: 'text', message: msg }
  },
}

register(entry)
export default entry
