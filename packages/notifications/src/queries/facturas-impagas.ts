import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'facturas_impagas',
  type: 'query',
  description:
    'Facturas (comprobantes AFIP) autorizadas con saldo pendiente. Excluye notas de credito. Params opcionales: dias_vencidas (default 0, muestra todas).',
  params: z.object({
    dias_vencidas: z.coerce.number().int().min(0).default(0),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { dias_vencidas = 0 } = params

    // Comprobantes autorizados que no son NC, con vencimiento de pago vencido
    // We consider a factura "impaga" if it is autorizado and has a fecha_vto_pago in the past
    // or no fecha_vto_pago but older than dias_vencidas days
    const conditions = [
      `c.org_id = $1`,
      `c.tipo NOT LIKE 'NC%'`,
      `c.estado = 'autorizado'`,
    ]
    const values: unknown[] = [orgId]

    if (dias_vencidas > 0) {
      values.push(dias_vencidas)
      conditions.push(
        `COALESCE(c.fecha_vto_pago, c.fecha) <= CURRENT_DATE - INTERVAL '1 day' * $${values.length}`
      )
    }

    const sql = `
      SELECT
        c.id,
        c.tipo,
        c.punto_venta,
        c.numero,
        c.fecha,
        c.fecha_vto_pago,
        c.imp_total,
        c.cliente_nombre
      FROM comprobantes c
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.fecha ASC
      LIMIT 30
    `

    const result = await query<{
      id: string
      tipo: string
      punto_venta: number
      numero: number
      fecha: string
      fecha_vto_pago: string | null
      imp_total: string
      cliente_nombre: string
    }>(sql, values)

    if (result.rows.length === 0) {
      const msg = dias_vencidas > 0
        ? `\u2705 No hay facturas vencidas hace mas de ${dias_vencidas} dias.`
        : '\u2705 No hay facturas pendientes de cobro.'
      return { type: 'text', message: msg }
    }

    let totalPendiente = 0
    const lines = result.rows.map((r) => {
      const total = Number(r.imp_total)
      totalPendiente += total
      const pv = String(r.punto_venta).padStart(4, '0')
      const nro = String(r.numero).padStart(8, '0')
      const vto = r.fecha_vto_pago
        ? new Date(r.fecha_vto_pago).toLocaleDateString('es-AR')
        : 'sin vto'
      return `\u2022 ${r.tipo} ${pv}-${nro} | ${r.cliente_nombre}\n  $${total.toLocaleString('es-AR')} | Vto: ${vto}`
    })

    return {
      type: 'text',
      message: `\u{1F4B8} ${result.rows.length} factura(s) pendientes — Total: $${totalPendiente.toLocaleString('es-AR')}${dias_vencidas > 0 ? ` (vencidas >${dias_vencidas}d)` : ''}:\n\n${lines.join('\n\n')}`,
    }
  },
}

register(entry)
export default entry
