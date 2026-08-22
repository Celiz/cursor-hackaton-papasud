import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'ventas_semana',
  type: 'query',
  description:
    'Resumen semanal de ventas (comprobantes autorizados). Muestra totales de la semana actual (lunes a hoy) con desglose diario.',
  params: z.object({}),
  async execute(orgId): Promise<QueryResult> {
    const sql = `
      SELECT
        c.fecha,
        COUNT(*) AS cantidad,
        SUM(CASE WHEN c.tipo NOT LIKE 'NC%' THEN c.imp_total ELSE 0 END) AS total_facturas,
        SUM(CASE WHEN c.tipo LIKE 'NC%' THEN c.imp_total ELSE 0 END) AS total_nc,
        SUM(CASE WHEN c.tipo NOT LIKE 'NC%' THEN c.imp_total ELSE 0 END)
          - SUM(CASE WHEN c.tipo LIKE 'NC%' THEN c.imp_total ELSE 0 END) AS neto_dia
      FROM comprobantes c
      WHERE c.org_id = $1
        AND c.estado = 'autorizado'
        AND c.fecha >= date_trunc('week', CURRENT_DATE)
        AND c.fecha <= CURRENT_DATE
      GROUP BY c.fecha
      ORDER BY c.fecha
    `

    const result = await query<{
      fecha: string
      cantidad: string
      total_facturas: string
      total_nc: string
      neto_dia: string
    }>(sql, [orgId])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: '\u{1F4C8} Sin ventas esta semana.',
      }
    }

    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
    let totalSemana = 0

    const lines = result.rows.map((r) => {
      const fecha = new Date(r.fecha + 'T12:00:00')
      const dia = diasSemana[fecha.getDay()]
      const neto = Number(r.neto_dia)
      totalSemana += neto
      const nc = Number(r.total_nc)
      const ncText = nc > 0 ? ` (NC: -$${nc.toLocaleString('es-AR')})` : ''
      return `  ${dia} ${fecha.toLocaleDateString('es-AR')}: $${neto.toLocaleString('es-AR')} — ${r.cantidad} comp.${ncText}`
    })

    return {
      type: 'text',
      message: `\u{1F4C8} Ventas de la semana:\n\n${lines.join('\n')}\n\n\u{1F4B0} Total semana: $${totalSemana.toLocaleString('es-AR')}`,
    }
  },
}

register(entry)
export default entry
