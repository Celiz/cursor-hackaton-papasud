import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'servicios_demorados',
  type: 'query',
  params: z.object({ dias: z.string().optional() }),
  description:
    'Servicios técnicos abiertos hace más de N días sin cerrar. Detecta órdenes trabadas. Param: dias (default 15).',
  execute: async (orgId: string, params: Record<string, any>): Promise<QueryResult> => {
    const dias = parseInt(params.dias) || 15

    const result = await query(`
      SELECT s.id, s.numero_ticket, s.estado, s.fecha::date,
             c.nombre as cliente,
             COALESCE(eu.nombre_personalizado, e.nombre) as equipo,
             s.diagnostico,
             EXTRACT(days FROM NOW() - s.fecha)::int as dias_abierto
      FROM servicios s
      LEFT JOIN clientes c ON c.id = s.cliente_id
      LEFT JOIN equipos_unidades eu ON eu.id = s.equipo_id
      LEFT JOIN equipos e ON e.id = eu.equipo_id
      WHERE s.org_id = $1
        AND s.estado NOT IN ('Entregado', 'Cancelado', 'Finalizado', 'Facturado', 'Sin cargo entregado', 'Sin cargo finalizado')
        AND s.fecha < NOW() - INTERVAL '1 day' * $2
      ORDER BY s.fecha ASC
      LIMIT 20
    `, [orgId, dias])

    if (result.rows.length === 0) {
      return { type: 'text', message: `No hay servicios abiertos hace más de ${dias} días. 👍` }
    }

    const lines = result.rows.map((r: any) =>
      `• **${r.cliente || 'Sin cliente'}** — ${r.equipo || 'Sin equipo'} (${r.estado}) — ${r.dias_abierto} días abierto${r.numero_ticket ? ` [${r.numero_ticket}]` : ''}`
    )

    return {
      type: 'text',
      message: `🔧 **${result.rows.length} servicios demorados** (más de ${dias} días):\n\n${lines.join('\n')}`
    }
  },
}

register(entry)
