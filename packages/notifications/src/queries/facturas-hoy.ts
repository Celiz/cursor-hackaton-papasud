import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'facturas_hoy',
  type: 'query',
  description:
    'Facturas (comprobantes AFIP) emitidas hoy. Incluye todas las autorizadas del dia.',
  params: z.object({}),
  async execute(orgId): Promise<QueryResult> {
    const sql = `
      SELECT
        c.id,
        c.tipo,
        c.punto_venta,
        c.numero,
        c.imp_total,
        c.cliente_nombre,
        c.estado,
        c.cae
      FROM comprobantes c
      WHERE c.org_id = $1
        AND c.fecha = CURRENT_DATE
      ORDER BY c.created_at DESC
    `

    const result = await query<{
      id: string
      tipo: string
      punto_venta: number
      numero: number
      imp_total: string
      cliente_nombre: string
      estado: string
      cae: string | null
    }>(sql, [orgId])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: '\u{1F4C4} No se emitieron comprobantes hoy.',
      }
    }

    let total = 0
    const lines = result.rows.map((r) => {
      const monto = Number(r.imp_total)
      total += r.tipo.startsWith('NC') ? -monto : monto
      const pv = String(r.punto_venta).padStart(4, '0')
      const nro = String(r.numero).padStart(8, '0')
      const cae = r.cae ? '\u2705' : '\u23F3'
      return `${cae} ${r.tipo} ${pv}-${nro} | ${r.cliente_nombre} | $${monto.toLocaleString('es-AR')}`
    })

    return {
      type: 'text',
      message: `\u{1F4C4} ${result.rows.length} comprobante(s) hoy — Neto: $${total.toLocaleString('es-AR')}:\n\n${lines.join('\n')}`,
    }
  },
}

register(entry)
export default entry
