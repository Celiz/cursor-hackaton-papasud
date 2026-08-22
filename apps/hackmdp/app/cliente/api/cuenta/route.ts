import { NextRequest, NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { query } from '@/lib/db'

export const revalidate = 0

export async function GET() {
  const session = await getClienteSession()
  if (!session || session.scope === 'limited') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const persona = await query(
    `SELECT p.nombre, p.email, p.telefono, p.documento_tipo, p.documento_nro
     FROM personas p WHERE p.id = $1`,
    [session.persona_id]
  )

  const contact = await query(
    `SELECT datos_extra FROM org_contacts WHERE id = $1`,
    [session.contact_id]
  )

  const hasCredentials = await query(
    `SELECT id FROM auth_credentials WHERE persona_id = $1 LIMIT 1`,
    [session.persona_id]
  )

  const datosExtra = (contact.rows[0] as any)?.datos_extra || {}
  const preferencias = datosExtra.preferencias || { email: true, whatsapp: true }

  return NextResponse.json({
    persona: persona.rows[0] || {},
    preferencias,
    has_credentials: !!hasCredentials.rows[0],
    origen: session.origen,
  })
}
