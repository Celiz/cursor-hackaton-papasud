import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rows } = await query(
    `SELECT i.*,
            (SELECT count(*) FROM pap_ot_insumos oi WHERE oi.insumo_id = i.id) AS usos,
            (SELECT count(*) FROM pap_ot_insumos oi WHERE oi.insumo_id = i.id AND oi.fuera_de_rango) AS usos_fuera_rango
       FROM pap_insumos i
      WHERE i.org_id = $1 AND i.activo
      ORDER BY i.tipo, i.nombre`,
    [session.org_id]
  )
  return NextResponse.json({ insumos: rows })
}
