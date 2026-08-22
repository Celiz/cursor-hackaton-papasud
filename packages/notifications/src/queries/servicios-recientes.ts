import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'servicios_recientes',
  type: 'query',
  description:
    'Servicios técnicos ingresados hoy. Muestra cliente, equipo, falla y estado.',
  params: z.object({}),
  async execute(orgId): Promise<QueryResult> {
    const result = await query<{
      id: string
      cliente: string
      equipo_desc: string | null
      falla_declarada: string | null
      estado: string
      fecha: string
    }>(`
      SELECT
        s.id,
        COALESCE(c.nombre, '(sin cliente)') AS cliente,
        CONCAT_WS(' ', e.marca, e.modelo) AS equipo_desc,
        s.falla_declarada,
        s.estado,
        COALESCE(s.fecha, s.created_at::date) AS fecha
      FROM servicios s
      LEFT JOIN clientes c ON c.id = s.cliente_id
      LEFT JOIN equipos_unidades eu ON eu.id = s.equipo_id
      LEFT JOIN equipos e ON e.id = eu.equipo_id
      WHERE s.org_id = $1
        AND COALESCE(s.fecha, s.created_at::date) = CURRENT_DATE
      ORDER BY s.created_at DESC
    `, [orgId])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: 'No ingresaron servicios hoy.',
      }
    }

    const lines = result.rows.map((r) => {
      const equipo = r.equipo_desc?.trim() ? ` | ${r.equipo_desc}` : ''
      return `${r.cliente}${equipo} | ${r.falla_declarada || '(sin falla)'} | ${r.estado}`
    })

    return {
      type: 'text',
      message: `${result.rows.length} servicio(s) ingresado(s) hoy:\n\n${lines.join('\n')}`,
    }
  },
}

register(entry)
export default entry
