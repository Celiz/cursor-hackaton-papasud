import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'buscar_cliente',
  type: 'action',
  description:
    'Buscar clientes por nombre. Busca en org_contacts + personas usando ILIKE. Param requerido: texto.',
  params: z.object({
    texto: z.string().min(2),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { texto } = params
    const pattern = `%${texto}%`

    const sql = `
      SELECT
        oc.id AS contact_id,
        p.nombre,
        COALESCE(p.apellido, '') AS apellido,
        p.email,
        p.telefono,
        p.documento_nro,
        oc.tipo
      FROM org_contacts oc
      JOIN personas p ON p.id = oc.persona_id
      WHERE oc.org_id = $1
        AND (
          p.nombre ILIKE $2
          OR COALESCE(p.apellido, '') ILIKE $2
          OR CONCAT(p.nombre, ' ', COALESCE(p.apellido, '')) ILIKE $2
          OR p.email ILIKE $2
          OR p.documento_nro ILIKE $2
        )
      ORDER BY p.nombre
      LIMIT 15
    `

    const result = await query<{
      contact_id: string
      nombre: string
      apellido: string
      email: string | null
      telefono: string | null
      documento_nro: string | null
      tipo: string
    }>(sql, [orgId, pattern])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: `\u{1F50D} No se encontraron clientes con "${texto}".`,
      }
    }

    const lines = result.rows.map((r, i) => {
      const nombre = r.apellido ? `${r.nombre} ${r.apellido}` : r.nombre
      const email = r.email ? `\u2709\uFE0F ${r.email}` : ''
      const tel = r.telefono ? `\u{1F4DE} ${r.telefono}` : ''
      const doc = r.documento_nro ? `\u{1F4C4} ${r.documento_nro}` : ''
      const extras = [email, tel, doc].filter(Boolean).join(' | ')
      return `${i + 1}. ${nombre} (${r.tipo})${extras ? `\n   ${extras}` : ''}`
    })

    return {
      type: 'text',
      message: `\u{1F50D} ${result.rows.length} resultado(s) para "${texto}":\n\n${lines.join('\n')}`,
    }
  },
}

register(entry)
export default entry
