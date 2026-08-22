import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rows } = await query(
    `SELECT e.*,
            count(p.id)                          AS lotes,
            COALESCE(sum(p.superficie_ha), 0)    AS superficie_lotes_ha,
            count(p.id) FILTER (WHERE p.estado = 'sembrado') AS lotes_sembrados
       FROM pap_establecimientos e
       LEFT JOIN pap_parcelas p ON p.establecimiento_id = e.id AND p.activo
      WHERE e.org_id = $1 AND e.activo
      GROUP BY e.id
      ORDER BY superficie_lotes_ha DESC`,
    [session.org_id]
  )
  return NextResponse.json({ establecimientos: rows })
}
