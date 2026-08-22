import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'
import { extractContact } from '../helpers'

const entry: CatalogEntry = {
  id: 'segmentar_clientes',
  type: 'action',
  description:
    'Segmentar clientes por tipo de equipo que tienen. Busca por marca, modelo o tipo de equipo. Muestra clientes con ese equipo, ubicación y contacto.',
  params: z.object({
    equipo: z.string().describe('Marca, modelo o tipo de equipo a buscar (ej: "diferencial", "centrifuga", "Siemens")'),
    solo_activos: z.boolean().optional().default(true),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { equipo, solo_activos } = params
    const pattern = `%${equipo}%`

    const estadoFilter = solo_activos !== false ? "AND c.estado = 'Activo'" : ''

    const result = await query<{
      cliente_id: string
      cliente_nombre: string
      localidad: string | null
      provincia: string | null
      telefono: any
      email: any
      equipos: string
      cantidad: string
    }>(`
      SELECT
        c.id AS cliente_id,
        c.nombre AS cliente_nombre,
        c.localidad,
        c.provincia,
        c.telefono,
        c.email,
        STRING_AGG(DISTINCT CONCAT_WS(' ', e.marca, e.modelo), ', ' ORDER BY CONCAT_WS(' ', e.marca, e.modelo)) AS equipos,
        COUNT(eu.id)::text AS cantidad
      FROM clientes c
      JOIN equipos_unidades eu ON eu.cliente_id = c.id AND eu.activo = true
      JOIN equipos e ON e.id = eu.equipo_id
      WHERE c.org_id = $1
        ${estadoFilter}
        AND (
          e.marca ILIKE $2
          OR e.modelo ILIKE $2
          OR e.tipo ILIKE $2
          OR CONCAT_WS(' ', e.marca, e.modelo) ILIKE $2
          OR e.descripcion ILIKE $2
        )
      GROUP BY c.id, c.nombre, c.localidad, c.provincia, c.telefono, c.email
      ORDER BY COUNT(eu.id) DESC, c.nombre
      LIMIT 30
    `, [orgId, pattern])

    if (result.rows.length === 0) {
      return { type: 'text', message: `No encontré clientes con equipos que matcheen "${equipo}".` }
    }

    const lines = result.rows.map(r => {
      const ubicacion = [r.localidad, r.provincia].filter(Boolean).join(', ')
      const tel = extractContact(r.telefono)
      const contacto = tel || extractContact(r.email) || ''

      return `• **${r.cliente_nombre}** (${r.cantidad} unid.) — ${r.equipos}\n  ${ubicacion}${contacto ? ` | ${contacto}` : ''}`
    })

    const totalUnidades = result.rows.reduce((sum, r) => sum + Number(r.cantidad), 0)

    return {
      type: 'text',
      message: `${result.rows.length} cliente(s) con "${equipo}" (${totalUnidades} unidades):\n\n${lines.join('\n\n')}`,
    }
  },
}

register(entry)
export default entry
