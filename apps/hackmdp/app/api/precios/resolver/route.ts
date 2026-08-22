import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

type Fuente = 'override_fijo' | 'override_margen' | 'lista_margen' | 'producto_default'

interface ResolvedPrice {
  producto_id: string
  precio_venta: number
  precio_costo: number
  fuente: Fuente
  lista_id: string | null
  lista_nombre: string | null
}

async function resolvePrices(
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

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('cliente_id') || null
    const listaId = searchParams.get('lista_id') || null
    const productoIdsParam = searchParams.get('producto_ids') || searchParams.get('producto_id') || ''
    const productoIds = productoIdsParam.split(',').map((s) => s.trim()).filter(Boolean)

    if (productoIds.length === 0) {
      return NextResponse.json({ error: 'producto_id o producto_ids es requerido' }, { status: 400 })
    }

    const results = await resolvePrices(session.org_id, productoIds, clienteId, listaId)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error in /api/precios/resolver GET:', error)
    return NextResponse.json({ error: 'Error al resolver precios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const clienteId: string | null = body.cliente_id || null
    const listaId: string | null = body.lista_id || null
    const productoIds: string[] = Array.isArray(body.producto_ids) ? body.producto_ids : []

    if (productoIds.length === 0) {
      return NextResponse.json({ error: 'producto_ids es requerido' }, { status: 400 })
    }

    const results = await resolvePrices(session.org_id, productoIds, clienteId, listaId)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error in /api/precios/resolver POST:', error)
    return NextResponse.json({ error: 'Error al resolver precios' }, { status: 500 })
  }
}
