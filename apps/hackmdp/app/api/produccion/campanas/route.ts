import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rows } = await query(
    `SELECT c.*,
            round((c.produccion_tn / NULLIF(c.superficie_ha, 0))::numeric, 1) AS rinde_promedio,
            count(r.id)                                  AS lotes_sembrados,
            round(avg(r.descarte_pct)::numeric, 1)       AS descarte_promedio
       FROM pap_campanas c
       LEFT JOIN pap_rendimientos r ON r.campana_id = c.id
      WHERE c.org_id = $1
      GROUP BY c.id
      ORDER BY c.anio DESC`,
    [session.org_id]
  )
  return NextResponse.json({ campanas: rows })
}
