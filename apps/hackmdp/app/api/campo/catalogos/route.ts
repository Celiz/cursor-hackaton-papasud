import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

/** Parcelas, tareas e insumos: lo que el modelo puede elegir y nada más. */
export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [parcelas, tareas, insumos] = await Promise.all([
    query(
      `SELECT p.id, p.codigo, p.nombre, p.superficie_ha, p.estado, p.tiene_riego,
              p.latitud, p.longitud, e.nombre AS establecimiento
         FROM pap_parcelas p
         LEFT JOIN pap_establecimientos e ON e.id = p.establecimiento_id
        WHERE p.org_id = $1 AND p.activo
        ORDER BY (regexp_replace(p.codigo, '\\D', '', 'g'))::int`,
      [session.org_id]
    ),
    query(
      `SELECT id, codigo, nombre, alias, requiere_insumos
         FROM pap_tareas_tipo WHERE org_id = $1 ORDER BY orden`,
      [session.org_id]
    ),
    query(
      `SELECT id, nombre, tipo, unidad, dosis_min, dosis_max, alias
         FROM pap_insumos WHERE org_id = $1 AND activo ORDER BY tipo, nombre`,
      [session.org_id]
    ),
  ])

  return NextResponse.json({
    parcelas: parcelas.rows,
    tareas: tareas.rows,
    insumos: insumos.rows,
  })
}
