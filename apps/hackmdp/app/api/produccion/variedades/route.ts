import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

/** Variedades con su desempeño histórico: para qué sirve cada una, con números. */
export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rows } = await query(
    `SELECT v.*,
            count(r.id)                                    AS siembras,
            round(avg(r.rendimiento_tn_ha)::numeric, 1)    AS rinde_promedio,
            round(max(r.rendimiento_tn_ha)::numeric, 1)    AS rinde_max,
            round(avg(r.descarte_pct)::numeric, 1)         AS descarte_promedio,
            round(sum(r.produccion_tn)::numeric)           AS produccion_total_tn
       FROM pap_variedades v
       LEFT JOIN pap_rendimientos r ON r.variedad_id = v.id
      WHERE v.org_id = $1 AND v.activo
      GROUP BY v.id
      ORDER BY siembras DESC`,
    [session.org_id]
  )
  return NextResponse.json({ variedades: rows })
}
