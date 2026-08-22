import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'ver_listas_email',
  type: 'action',
  description:
    'Lista todas las listas de email marketing de la organización con cantidad de contactos.',
  params: z.object({}),
  async execute(orgId): Promise<QueryResult> {
    const result = await query<{
      id: string
      nombre: string
      descripcion: string | null
      total_contactos: string
      activa: boolean
      created_at: string
    }>(`
      SELECT
        l.id,
        l.nombre,
        l.descripcion,
        COALESCE(l.total_contactos, 0)::text AS total_contactos,
        l.activa,
        l.created_at::date::text AS created_at
      FROM email_listas l
      WHERE l.org_id = $1
      ORDER BY l.created_at DESC
      LIMIT 20
    `, [orgId])

    if (result.rows.length === 0) {
      return { type: 'text', message: 'No hay listas de email creadas todavía.' }
    }

    const lines = result.rows.map(r => {
      const estado = r.activa ? '' : ' (inactiva)'
      return `• **${r.nombre}**${estado} — ${r.total_contactos} contactos\n  ID: ${r.id.slice(0, 8)}`
    })

    return {
      type: 'text',
      message: `${result.rows.length} lista(s):\n\n${lines.join('\n\n')}`,
    }
  },
}

register(entry)
export default entry
