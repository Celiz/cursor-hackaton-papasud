import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'stock_bajo',
  type: 'query',
  description:
    'Productos con stock actual por debajo del minimo configurado. Param opcional: categoria_id para filtrar por categoria.',
  params: z.object({
    categoria_id: z.string().uuid().optional(),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { categoria_id } = params

    const conditions = [
      `p.org_id = $1`,
      `p.activo = true`,
      `p.stock_minimo > 0`,
      `p.stock_actual < p.stock_minimo`,
      `p.deleted_at IS NULL`,
    ]
    const values: unknown[] = [orgId]

    if (categoria_id) {
      values.push(categoria_id)
      conditions.push(`p.categoria_id = $${values.length}`)
    }

    const sql = `
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.stock_actual,
        p.stock_minimo,
        COALESCE(c.nombre, p.categoria) AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY (p.stock_actual - p.stock_minimo) ASC
      LIMIT 30
    `

    const result = await query<{
      id: string
      codigo: string
      nombre: string
      stock_actual: string
      stock_minimo: string
      categoria_nombre: string | null
    }>(sql, values)

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: '\u2705 Todo el stock esta por encima del minimo.',
      }
    }

    const lines = result.rows.map((r) => {
      const actual = Number(r.stock_actual)
      const minimo = Number(r.stock_minimo)
      const cat = r.categoria_nombre ? ` (${r.categoria_nombre})` : ''
      const urgencia = actual <= 0 ? '\u{1F534}' : '\u{1F7E1}'
      return `${urgencia} ${r.codigo} - ${r.nombre}${cat}\n  Stock: ${actual} / Min: ${minimo} (faltan ${minimo - actual})`
    })

    return {
      type: 'text',
      message: `\u{1F4E6} ${result.rows.length} producto(s) con stock bajo:\n\n${lines.join('\n\n')}`,
    }
  },
}

register(entry)
export default entry
