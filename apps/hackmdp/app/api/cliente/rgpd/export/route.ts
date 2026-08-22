import { NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { query } from '@/lib/db'

export const revalidate = 0

export async function GET() {
  const session = await getClienteSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const orgResult = await query('SELECT pais FROM organizations WHERE id = $1', [session.org_id])
  if (orgResult.rows[0]?.pais !== 'ES') {
    return NextResponse.json({ error: 'No aplicable' }, { status: 400 })
  }

  const persona = await query(
    `SELECT nombre, email, telefono, documento_tipo, documento_nro, fecha_nacimiento
     FROM personas WHERE id = $1`,
    [session.persona_id]
  )

  const contactData = await query(
    `SELECT c.nombre, c.email, c.telefono, c.direccion, c.localidad, c.provincia, c.cuit
     FROM clientes c
     JOIN org_contacts oc ON oc.cliente_id = c.id
     WHERE oc.persona_id = $1 AND oc.org_id = $2
     LIMIT 1`,
    [session.persona_id, session.org_id]
  )

  const consents = await query(
    `SELECT consent_type, accepted, accepted_at
     FROM rgpd_consents
     WHERE persona_id = $1 AND org_id = $2
     ORDER BY accepted_at DESC`,
    [session.persona_id, session.org_id]
  )

  const exportData = {
    exported_at: new Date().toISOString(),
    personal_data: persona.rows[0] || {},
    client_data: contactData.rows[0] || {},
    consents: consents.rows,
  }

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="mis-datos-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
