import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

/** Los círculos de riego con sus lotes, listo para dibujar y para ubicar por GPS. */
export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [pivotes, lotes] = await Promise.all([
    query(
      `SELECT id, nombre, latitud::float8, longitud::float8, radio_m::float8,
              cuadrante_base, estimado, notas
         FROM pap_pivotes WHERE org_id = $1 ORDER BY nombre`,
      [session.org_id]
    ),
    query(
      `SELECT p.id, p.codigo, p.nombre, p.pivote, p.cuadrante, p.tercio, p.anillo,
              p.anillo_desde::float8, p.anillo_hasta::float8,
              p.superficie_ha::float8, p.estado, p.tipo_suelo, p.tiene_riego,
              ot.tarea AS ultima_tarea, ot.fecha AS ultima_fecha,
              (CURRENT_DATE - ot.fecha) AS dias_sin_actividad
         FROM pap_parcelas p
         LEFT JOIN LATERAL (
           SELECT tarea, fecha FROM pap_ordenes_trabajo
            WHERE parcela_id = p.id ORDER BY fecha DESC LIMIT 1
         ) ot ON true
        WHERE p.org_id = $1 AND p.activo
        ORDER BY p.pivote, p.cuadrante, p.anillo`,
      [session.org_id]
    ),
  ])

  return NextResponse.json({ pivotes: pivotes.rows, lotes: lotes.rows })
}
