import { NextRequest, NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { query } from '@/lib/db'

export const revalidate = 0

export async function GET(request: NextRequest) {
  const session = await getClienteSession()
  if (!session || session.scope === 'limited') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const estado = sp.get('estado')
  const limit = Number(sp.get('limit')) || 20
  const offset = Number(sp.get('offset')) || 0

  const conditions = ['p.org_id = $1', 'oc.id = $2', 'p.deleted_at IS NULL']
  const params: unknown[] = [session.org_id, session.contact_id]
  let idx = 3

  // Only show presupuestos that have been sent to the client (not borradores)
  conditions.push(`p.estado != 'borrador'`)

  if (estado) {
    conditions.push(`p.estado = $${idx}`)
    params.push(estado)
    idx++
  }

  const where = conditions.join(' AND ')

  const result = await query(
    `SELECT p.id, p.numero, p.titulo, p.total, p.estado, p.created_at as fecha,
       p.vigencia_dias, p.firmado,
       vp.nombre as paciente_nombre,
       (SELECT COUNT(*)::int FROM vet_presupuesto_items pi WHERE pi.presupuesto_id = p.id) as items_count
     FROM vet_presupuestos p
     JOIN org_contacts oc ON oc.persona_id = p.cliente_id AND oc.org_id = p.org_id
     LEFT JOIN vet_pacientes vp ON vp.id = p.paciente_id
     WHERE ${where}
     ORDER BY p.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  )

  const countResult = await query(
    `SELECT COUNT(*)::int as count
     FROM vet_presupuestos p
     JOIN org_contacts oc ON oc.persona_id = p.cliente_id AND oc.org_id = p.org_id
     WHERE ${where}`,
    params
  )

  return NextResponse.json({
    presupuestos: result.rows,
    total: countResult.rows[0]?.count || 0,
  })
}
