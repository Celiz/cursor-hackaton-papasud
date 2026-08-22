import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'clientes_que_consumen',
  type: 'query',
  description:
    'Top clientes que compran un producto determinado. Muestra consumo mensual, cantidad de compras y ultima compra. Params: producto_nombre (buscar por nombre) o producto_id (UUID directo).',
  params: z.object({
    producto_id: z.string().uuid().optional(),
    producto_nombre: z.string().optional(),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    let productoId: string | undefined = params.producto_id
    let productoNombre: string | undefined

    // If producto_nombre given, search for the product first
    if (!productoId && params.producto_nombre) {
      const searchSql = `
        SELECT id, nombre, codigo
        FROM productos
        WHERE org_id = $1
          AND nombre ILIKE '%' || $2 || '%'
          AND deleted_at IS NULL
        LIMIT 5
      `
      const searchResult = await query<{
        id: string
        nombre: string
        codigo: string
      }>(searchSql, [orgId, params.producto_nombre])

      if (searchResult.rows.length === 0) {
        return {
          type: 'text',
          message: `\uD83D\uDD0D No se encontraron productos con "${params.producto_nombre}".`,
        }
      }

      if (searchResult.rows.length > 1) {
        const lines = searchResult.rows.map(
          (r, i) => `${i + 1}. ${r.codigo} - ${r.nombre} (ID: ${r.id.substring(0, 8).toUpperCase()})`
        )
        return {
          type: 'text',
          message: `\uD83D\uDD0D Se encontraron ${searchResult.rows.length} productos. Se mas especifico:\n\n${lines.join('\n')}`,
        }
      }

      productoId = searchResult.rows[0].id
      productoNombre = searchResult.rows[0].nombre
    }

    if (!productoId) {
      return {
        type: 'text',
        message: 'Necesito un producto_nombre o producto_id para buscar.',
      }
    }

    // If we don't have the name yet, fetch it
    if (!productoNombre) {
      const nameResult = await query<{ nombre: string }>(
        `SELECT nombre FROM productos WHERE id = $1 AND org_id = $2`,
        [productoId, orgId]
      )
      productoNombre = nameResult.rows[0]?.nombre ?? 'Producto'
    }

    const sql = `
      SELECT
        COALESCE(c.nombre_fantasia, c.nombre) as cliente,
        SUM(fi.cantidad)::numeric as total_unidades,
        COUNT(DISTINCT f.id)::int as compras,
        ROUND(
          SUM(fi.cantidad) / GREATEST(
            EXTRACT(EPOCH FROM (now() - MIN(f.fecha_emision))) / (86400.0 * 30), 1
          ), 1
        ) as promedio_mensual,
        MAX(f.fecha_emision) as ultima_compra,
        (CURRENT_DATE - MAX(f.fecha_emision)::date)::int as dias_sin_comprar
      FROM facturas f
      JOIN facturas_items fi ON fi.factura_id = f.id
      JOIN clientes c ON f.cliente_id = c.id
      WHERE f.org_id = $1
        AND fi.producto_id = $2
        AND f.estado NOT IN ('anulada', 'borrador')
      GROUP BY c.id, c.nombre, c.nombre_fantasia
      ORDER BY total_unidades DESC
      LIMIT 10
    `

    const result = await query<{
      cliente: string
      total_unidades: string
      compras: number
      promedio_mensual: string
      ultima_compra: string
      dias_sin_comprar: number
    }>(sql, [orgId, productoId])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: `\uD83D\uDC65 No se encontraron clientes que hayan comprado "${productoNombre}".`,
      }
    }

    const lines = result.rows.map((r, i) => {
      const promedio = Number(r.promedio_mensual)
      const diasSin = r.dias_sin_comprar
      const warning = diasSin > 60 ? '\n   \u26A0\uFE0F Hace mucho que no compra' : ''
      return `${i + 1}. ${r.cliente} \u2014 ${promedio} un/mes, ${r.compras} compras (ultima: hace ${diasSin} dias)${warning}`
    })

    return {
      type: 'text',
      message: `\uD83D\uDC65 Top clientes que compran "${productoNombre}":\n\n${lines.join('\n')}`,
    }
  },
}

register(entry)
export default entry
