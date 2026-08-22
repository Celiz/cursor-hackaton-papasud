import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'presupuestos_vencidos',
  type: 'query',
  description:
    'Presupuestos veterinarios vencidos (estado = vencido). Sin parametros requeridos.',
  params: z.object({}),
  async execute(orgId): Promise<QueryResult> {
    const sql = `
      SELECT
        vp.id,
        vp.numero,
        vp.titulo,
        vp.total,
        vp.created_at,
        vp.vigencia_dias,
        p_cli.nombre AS cliente_nombre,
        p_vet.nombre AS veterinario_nombre
      FROM vet_presupuestos vp
      JOIN personas p_cli ON p_cli.id = vp.cliente_id
      JOIN personas p_vet ON p_vet.id = vp.veterinario_id
      WHERE vp.org_id = $1
        AND vp.estado = 'vencido'
        AND vp.deleted_at IS NULL
      ORDER BY vp.created_at DESC
      LIMIT 25
    `

    const result = await query<{
      id: string
      numero: string | null
      titulo: string
      total: string | null
      created_at: string
      vigencia_dias: number
      cliente_nombre: string
      veterinario_nombre: string
    }>(sql, [orgId])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: '\u2705 No hay presupuestos vencidos.',
      }
    }

    const lines = result.rows.map((r) => {
      const total = r.total ? `$${Number(r.total).toLocaleString('es-AR')}` : 'sin total'
      return `\u2022 ${r.numero ?? '(sin nro)'} - ${r.titulo}\n  Cliente: ${r.cliente_nombre} | ${total} | Vigencia: ${r.vigencia_dias}d`
    })

    return {
      type: 'text',
      message: `\u26A0\uFE0F ${result.rows.length} presupuesto(s) vencidos:\n\n${lines.join('\n\n')}`,
    }
  },
}

register(entry)
export default entry
