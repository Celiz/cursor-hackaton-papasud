import { NextRequest, NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { query } from '@/lib/db'

export async function PATCH(request: NextRequest) {
  const session = await getClienteSession()
  if (!session || session.scope === 'limited') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { email, whatsapp } = await request.json()

  await query(
    `UPDATE org_contacts
     SET datos_extra = jsonb_set(
       COALESCE(datos_extra, '{}'::jsonb),
       '{preferencias}',
       $2::jsonb
     )
     WHERE id = $1`,
    [session.contact_id, JSON.stringify({ email: !!email, whatsapp: !!whatsapp })]
  )

  return NextResponse.json({ ok: true })
}
