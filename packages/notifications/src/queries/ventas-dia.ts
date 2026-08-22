import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'ventas_dia',
  type: 'query',
  description:
    'Resumen de ventas (comprobantes autorizados) del dia actual. Muestra total facturado, cantidad de comprobantes y desglose por tipo.',
  params: z.object({}),
  async execute(orgId): Promise<QueryResult> {
    const sql = `
      SELECT
        c.tipo,
        COUNT(*) AS cantidad,
        SUM(c.imp_total) AS total,
        SUM(c.imp_neto) AS neto,
        SUM(c.imp_iva) AS iva
      FROM comprobantes c
      WHERE c.org_id = $1
        AND c.fecha = CURRENT_DATE
        AND c.estado = 'autorizado'
      GROUP BY c.tipo
      ORDER BY c.tipo
    `

    const result = await query<{
      tipo: string
      cantidad: string
      total: string
      neto: string
      iva: string
    }>(sql, [orgId])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: '\u{1F4CA} Sin ventas autorizadas hoy.',
      }
    }

    let granTotal = 0
    let granNeto = 0
    let granCantidad = 0

    const lines = result.rows.map((r) => {
      const total = Number(r.total)
      const neto = Number(r.neto)
      const cant = Number(r.cantidad)

      if (r.tipo.startsWith('NC')) {
        granTotal -= total
        granNeto -= neto
      } else {
        granTotal += total
        granNeto += neto
      }
      granCantidad += cant

      return `  ${r.tipo}: ${cant} comp. | $${total.toLocaleString('es-AR')}`
    })

    return {
      type: 'text',
      message: `\u{1F4CA} Ventas del dia:\n\n${lines.join('\n')}\n\n\u{1F4B0} Total: $${granTotal.toLocaleString('es-AR')} (Neto: $${granNeto.toLocaleString('es-AR')})\n\u{1F4DD} ${granCantidad} comprobante(s)`,
    }
  },
}

register(entry)
export default entry
