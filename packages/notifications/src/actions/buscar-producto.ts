import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'buscar_producto',
  type: 'action',
  description:
    'Buscar productos por nombre o codigo. Devuelve nombre, precio, stock. Param requerido: texto.',
  params: z.object({
    texto: z.string().min(1),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { texto } = params
    const pattern = `%${texto}%`

    const sql = `
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.precio_venta,
        p.precio_costo,
        p.stock_actual,
        p.stock_minimo,
        p.activo,
        COALESCE(c.nombre, p.categoria) AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.org_id = $1
        AND p.deleted_at IS NULL
        AND (
          p.nombre ILIKE $2
          OR p.codigo ILIKE $2
        )
      ORDER BY p.nombre
      LIMIT 15
    `

    const result = await query<{
      id: string
      codigo: string
      nombre: string
      precio_venta: string
      precio_costo: string | null
      stock_actual: string
      stock_minimo: string
      activo: boolean
      categoria_nombre: string | null
    }>(sql, [orgId, pattern])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: `\u{1F50D} No se encontraron productos con "${texto}".`,
      }
    }

    const lines = result.rows.map((r, i) => {
      const precio = `$${Number(r.precio_venta).toLocaleString('es-AR')}`
      const stock = Number(r.stock_actual)
      const minimo = Number(r.stock_minimo)
      const stockIcon = minimo > 0 && stock < minimo ? '\u{1F534}' : '\u{1F7E2}'
      const cat = r.categoria_nombre ? ` | ${r.categoria_nombre}` : ''
      const inactivo = r.activo ? '' : ' [INACTIVO]'
      return `${i + 1}. ${r.codigo} - ${r.nombre}${inactivo}\n   ${precio} | ${stockIcon} Stock: ${stock}${cat}`
    })

    return {
      type: 'text',
      message: `\u{1F50D} ${result.rows.length} producto(s) para "${texto}":\n\n${lines.join('\n')}`,
    }
  },
}

register(entry)
export default entry
