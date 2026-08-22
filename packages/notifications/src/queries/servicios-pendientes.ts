import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'servicios_pendientes',
  type: 'query',
  description:
    'Servicios técnicos activos (pendientes o en progreso). Muestra cliente, equipo, falla y antigüedad.',
  params: z.object({}),
  async execute(orgId): Promise<QueryResult> {
    const result = await query<{
      id: string
      cliente: string
      equipo_desc: string | null
      falla_declarada: string | null
      estado: string
      dias: number
    }>(`
      SELECT
        s.id,
        COALESCE(c.nombre, '(sin cliente)') AS cliente,
        CONCAT_WS(' ', e.marca, e.modelo) AS equipo_desc,
        s.falla_declarada,
        s.estado,
        EXTRACT(DAY FROM NOW() - COALESCE(s.fecha, s.created_at::date))::int AS dias
      FROM servicios s
      LEFT JOIN clientes c ON c.id = s.cliente_id
      LEFT JOIN equipos_unidades eu ON eu.id = s.equipo_id
      LEFT JOIN equipos e ON e.id = eu.equipo_id
      WHERE s.org_id = $1
        AND s.estado NOT IN ('Entregado', 'Cancelado', 'Finalizado', 'Facturado', 'Sin cargo', 'Sin cargo/Garantía reparación', 'Sin cargo/Garantía venta', 'Sin cargo/Comodato')
      ORDER BY COALESCE(s.fecha, s.created_at) ASC
    `, [orgId])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: 'No hay servicios pendientes.',
      }
    }

    const lines = result.rows.map((r) => {
      const equipo = r.equipo_desc?.trim() ? ` | ${r.equipo_desc}` : ''
      const dias = r.dias > 0 ? ` (${r.dias}d)` : ' (hoy)'
      return `${r.cliente}${equipo} | ${r.falla_declarada || '(sin falla)'} | ${r.estado}${dias}`
    })

    return {
      type: 'text',
      message: `${result.rows.length} servicio(s) pendiente(s):\n\n${lines.join('\n')}`,
    }
  },
}

register(entry)
export default entry
