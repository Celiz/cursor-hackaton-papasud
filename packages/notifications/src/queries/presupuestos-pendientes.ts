import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'presupuestos_pendientes',
  type: 'query',
  description:
    'Presupuestos veterinarios sin respuesta del cliente (estado borrador o enviado). Params opcionales: veterinario_id, dias_antiguedad (default 7).',
  params: z.object({
    veterinario_id: z.string().uuid().optional(),
    dias_antiguedad: z.coerce.number().int().positive().default(7),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { veterinario_id, dias_antiguedad = 7 } = params

    const conditions = [
      `vp.org_id = $1`,
      `vp.estado IN ('borrador', 'enviado')`,
      `vp.deleted_at IS NULL`,
      `vp.created_at <= NOW() - INTERVAL '1 day' * $2`,
    ]
    const values: unknown[] = [orgId, dias_antiguedad]

    if (veterinario_id) {
      values.push(veterinario_id)
      conditions.push(`vp.veterinario_id = $${values.length}`)
    }

    const sql = `
      SELECT
        vp.id,
        vp.numero,
        vp.titulo,
        vp.estado,
        vp.total,
        vp.created_at,
        p_cli.nombre AS cliente_nombre,
        p_vet.nombre AS veterinario_nombre
      FROM vet_presupuestos vp
      JOIN personas p_cli ON p_cli.id = vp.cliente_id
      JOIN personas p_vet ON p_vet.id = vp.veterinario_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY vp.created_at ASC
      LIMIT 25
    `

    const result = await query<{
      id: string
      numero: string | null
      titulo: string
      estado: string
      total: string | null
      created_at: string
      cliente_nombre: string
      veterinario_nombre: string
    }>(sql, values)

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: `\u2705 No hay presupuestos pendientes (ultimos ${dias_antiguedad} dias).`,
      }
    }

    const lines = result.rows.map((r) => {
      const total = r.total ? `$${Number(r.total).toLocaleString('es-AR')}` : 'sin total'
      const dias = Math.floor(
        (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      return `\u2022 ${r.numero ?? '(sin nro)'} - ${r.titulo}\n  Cliente: ${r.cliente_nombre} | ${total} | ${r.estado} | hace ${dias}d`
    })

    return {
      type: 'text',
      message: `\u{1F4CB} ${result.rows.length} presupuesto(s) pendientes (>${dias_antiguedad}d):\n\n${lines.join('\n\n')}`,
    }
  },
}

register(entry)
export default entry
