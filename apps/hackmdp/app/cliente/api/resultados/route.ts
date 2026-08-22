import { NextRequest, NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { query } from '@/lib/db'

export const revalidate = 0

export async function GET(request: NextRequest) {
  const session = await getClienteSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const limit = Number(sp.get('limit')) || 20
  const offset = Number(sp.get('offset')) || 0

  const result = await query(
    `SELECT ot.id, ot.numero, ot.fecha_ingreso as fecha, ot.estado,
       vp.nombre as paciente_nombre, vp.especie as paciente_especie,
       (SELECT COUNT(*) FROM vet_estudios e WHERE e.orden_id = ot.id)::int as estudios_count
     FROM vet_ordenes_trabajo ot
     JOIN org_contacts oc ON oc.persona_id = ot.cliente_id AND oc.org_id = ot.org_id
     LEFT JOIN vet_pacientes vp ON vp.id = ot.paciente_id
     WHERE ot.org_id = $1 AND oc.id = $2
     ORDER BY ot.fecha_ingreso DESC
     LIMIT $3 OFFSET $4`,
    [session.org_id, session.contact_id, limit, offset]
  )

  const countResult = await query(
    `SELECT COUNT(*)::int as count
     FROM vet_ordenes_trabajo ot
     JOIN org_contacts oc ON oc.persona_id = ot.cliente_id AND oc.org_id = ot.org_id
     WHERE ot.org_id = $1 AND oc.id = $2`,
    [session.org_id, session.contact_id]
  )

  return NextResponse.json({
    ordenes: result.rows,
    total: countResult.rows[0]?.count || 0,
  })
}
