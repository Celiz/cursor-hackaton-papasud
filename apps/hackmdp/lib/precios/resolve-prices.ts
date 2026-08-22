import { query } from '@/lib/db'

export type Fuente = 'override_fijo' | 'override_margen' | 'lista_margen' | 'producto_default'

export interface ResolvedPrice {
  producto_id: string
  precio_venta: number
  precio_costo: number
  fuente: Fuente
  lista_id: string | null
  lista_nombre: string | null
}

/** Resuelve el precio vigente de productos según la lista del cliente (o un override
 *  de lista): override fijo → margen override → margen de lista → precio_venta default. */
export async function resolvePrices(
  orgId: string,
  productoIds: string[],
  clienteId: string | null,
  listaIdOverride: string | null = null
): Promise<ResolvedPrice[]> {
  if (productoIds.length === 0) return []

  // Lista lookup: explicit override takes precedence over cliente's lista
  const result = await query(
    `WITH lp AS (
       SELECT lp.id, lp.margen_porcentaje, lp.nombre
       FROM listas_precios lp
       WHERE lp.activa = true
         AND lp.org_id = $1
         AND lp.id = COALESCE(
           $4::uuid,
           (SELECT lista_precios_id FROM clientes
            WHERE id = $2 AND org_id = $1 AND lista_precios_id IS NOT NULL)
         )
       LIMIT 1
     )
     SELECT
       p.id AS producto_id,
       COALESCE(p.precio_costo, 0)::numeric AS precio_costo,
       COALESCE(p.precio_venta, 0)::numeric AS precio_default,
       lp.id AS lista_id,
       lp.nombre AS lista_nombre,
       CASE
         WHEN lpi.precio_fijo IS NOT NULL THEN lpi.precio_fijo
         WHEN lpi.margen_override IS NOT NULL THEN COALESCE(p.precio_costo, 0) * (1 + lpi.margen_override / 100.0)
         WHEN lp.id IS NOT NULL THEN COALESCE(p.precio_costo, 0) * (1 + lp.margen_porcentaje / 100.0)
         ELSE COALESCE(p.precio_venta, 0)
       END AS precio_resuelto,
       CASE
         WHEN lpi.precio_fijo IS NOT NULL THEN 'override_fijo'
         WHEN lpi.margen_override IS NOT NULL THEN 'override_margen'
         WHEN lp.id IS NOT NULL THEN 'lista_margen'
         ELSE 'producto_default'
       END AS fuente
     FROM productos p
     LEFT JOIN lp ON true
     LEFT JOIN lista_precios_items lpi
       ON lpi.lista_id = lp.id AND lpi.producto_id = p.id
     WHERE p.org_id = $1 AND p.id = ANY($3::uuid[])`,
    [orgId, clienteId, productoIds, listaIdOverride]
  )

  return result.rows.map((r) => ({
    producto_id: r.producto_id,
    precio_venta: Number(r.precio_resuelto) || 0,
    precio_costo: Number(r.precio_costo) || 0,
    fuente: r.fuente as Fuente,
    lista_id: r.lista_id || null,
    lista_nombre: r.lista_nombre || null,
  }))
}
