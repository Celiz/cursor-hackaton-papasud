import { NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { query } from '@/lib/db'

export async function POST(request: Request) {
  const session = await getClienteSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const orgResult = await query('SELECT pais FROM organizations WHERE id = $1', [session.org_id])
  if (orgResult.rows[0]?.pais !== 'ES') {
    return NextResponse.json({ error: 'No aplicable' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))

  const existing = await query(
    `SELECT id FROM rgpd_deletion_requests
     WHERE persona_id = $1 AND org_id = $2 AND status = 'pending'`,
    [session.persona_id, session.org_id]
  )
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Ya tiene una solicitud pendiente' }, { status: 409 })
  }

  const result = await query(
    `INSERT INTO rgpd_deletion_requests (persona_id, org_id, reason)
     VALUES ($1, $2, $3)
     RETURNING id, requested_at`,
    [session.persona_id, session.org_id, body.reason || null]
  )

  return NextResponse.json({
    id: result.rows[0].id,
    requested_at: result.rows[0].requested_at,
    message: 'Solicitud recibida. Sera procesada en un plazo maximo de 30 dias.',
  }, { status: 201 })
}
