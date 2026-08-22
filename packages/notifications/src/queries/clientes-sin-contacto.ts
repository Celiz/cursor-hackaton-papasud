import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'clientes_sin_contacto',
  type: 'query',
  params: z.object({ meses: z.string().optional() }),
  description:
    'Clientes que no tienen actividad (facturas, servicios, presupuestos) en los últimos N meses. Detecta oportunidades de reactivación. Param: meses (default 6).',
  execute: async (orgId: string, params: Record<string, any>): Promise<QueryResult> => {
    const meses = parseInt(params.meses) || 6
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - meses)

    const result = await query(`
      WITH ultima_actividad AS (
        SELECT c.id, c.nombre,
          GREATEST(
            COALESCE((SELECT MAX(f.fecha) FROM facturas f WHERE f.cliente_id = c.id AND f.org_id = $1), '1970-01-01'),
            COALESCE((SELECT MAX(s.fecha) FROM servicios s WHERE s.cliente_id = c.id AND s.org_id = $1), '1970-01-01')
          ) as ultima_fecha
        FROM clientes c
        WHERE c.org_id = $1 AND c.activo = true
      )
      SELECT nombre, ultima_fecha::date,
             EXTRACT(days FROM NOW() - ultima_fecha)::int as dias_sin_contacto
      FROM ultima_actividad
      WHERE ultima_fecha < $2
      ORDER BY ultima_fecha ASC
      LIMIT 20
    `, [orgId, cutoff.toISOString()])

    if (result.rows.length === 0) {
      return { type: 'text', message: `Todos los clientes activos tuvieron actividad en los últimos ${meses} meses. 👍` }
    }

    const lines = result.rows.map((r: any) =>
      `• **${r.nombre}** — ${r.dias_sin_contacto} días sin contacto (último: ${new Date(r.ultima_fecha).toLocaleDateString('es-AR')})`
    )

    return {
      type: 'text',
      message: `⚠️ **${result.rows.length} clientes sin contacto** en los últimos ${meses} meses:\n\n${lines.join('\n')}`
    }
  },
}

register(entry)
