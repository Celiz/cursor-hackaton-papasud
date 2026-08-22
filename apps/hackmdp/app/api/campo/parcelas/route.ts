import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

/** Parcelas con su última orden de trabajo — lo que consume el mapa. */
export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rows } = await query(
    `SELECT p.id, p.codigo, p.nombre, p.superficie_ha, p.estado, p.tiene_riego,
            p.latitud, p.longitud, p.tipo_suelo,
            e.nombre AS establecimiento, e.localidad,
            ot.tarea        AS ultima_tarea,
            ot.fecha        AS ultima_fecha,
            (CURRENT_DATE - ot.fecha) AS dias_sin_actividad,
            r.variedad, r.rendimiento_tn_ha AS ultimo_rinde
       FROM pap_parcelas p
       LEFT JOIN pap_establecimientos e ON e.id = p.establecimiento_id
       LEFT JOIN LATERAL (
         SELECT tarea, fecha FROM pap_ordenes_trabajo
          WHERE parcela_id = p.id ORDER BY fecha DESC LIMIT 1
       ) ot ON true
       LEFT JOIN LATERAL (
         SELECT variedad, rendimiento_tn_ha FROM vista_pap_historico
          WHERE lote = p.codigo ORDER BY campana_anio DESC LIMIT 1
       ) r ON true
      WHERE p.org_id = $1 AND p.activo
      ORDER BY (regexp_replace(p.codigo, '\\D', '', 'g'))::int`,
    [session.org_id]
  )

  return NextResponse.json({ parcelas: rows })
}
