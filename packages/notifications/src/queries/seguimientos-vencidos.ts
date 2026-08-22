import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'seguimientos_vencidos',
  type: 'query',
  params: z.object({ persona_id: z.string().optional() }),
  description:
    'Seguimientos CRM vencidos o que vencen hoy. Muestra oportunidades que necesitan acción inmediata.',
  execute: async (orgId: string, params: Record<string, any>): Promise<QueryResult> => {
    const personaId = params.persona_id

    const result = await query(`
      SELECT o.id, o.titulo, o.estado, o.monto_estimado,
             c.nombre as cliente,
             o.proximo_seguimiento::date,
             EXTRACT(days FROM NOW() - o.proximo_seguimiento)::int as dias_vencido,
             p.nombre as vendedor
      FROM crm_oportunidades o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN personas p ON p.id = COALESCE(o.usuario_asignado_id, o.vendedor_id)
      WHERE o.org_id = $1
        AND o.estado NOT IN ('ganada', 'perdida', 'cancelada')
        AND o.proximo_seguimiento IS NOT NULL
        AND o.proximo_seguimiento <= NOW()
        ${personaId ? "AND (o.usuario_asignado_id = $2 OR o.vendedor_id = $2)" : ""}
      ORDER BY o.proximo_seguimiento ASC
      LIMIT 20
    `, personaId ? [orgId, personaId] : [orgId])

    if (result.rows.length === 0) {
      return { type: 'text', message: 'No hay seguimientos CRM vencidos. 👍' }
    }

    const total = result.rows.reduce((s: number, r: any) => s + (parseFloat(r.monto_estimado) || 0), 0)
    const lines = result.rows.map((r: any) => {
      const monto = r.monto_estimado ? ` ($${Number(r.monto_estimado).toLocaleString('es-AR')})` : ''
      const vencido = r.dias_vencido > 0 ? `hace ${r.dias_vencido}d` : 'hoy'
      return `• **${r.cliente || r.titulo}**${monto} — ${r.vendedor || 'Sin asignar'} — vence ${vencido}`
    })

    return {
      type: 'text',
      message: `📋 **${result.rows.length} seguimientos vencidos** (pipeline: $${total.toLocaleString('es-AR')}):\n\n${lines.join('\n')}`
    }
  },
}

register(entry)
