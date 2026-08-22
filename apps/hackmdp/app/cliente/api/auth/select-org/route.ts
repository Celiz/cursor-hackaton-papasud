import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createClienteSession } from '@/lib/client-session'

export async function POST(request: NextRequest) {
  const { persona_id, org_id } = await request.json()
  if (!persona_id || !org_id) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const contact = await query<{ id: string }>(
    `SELECT id FROM org_contacts WHERE org_id = $1 AND persona_id = $2 AND tipo IN ('cliente', 'ambos')`,
    [org_id, persona_id]
  )
  if (!contact.rows[0]) {
    return NextResponse.json({ error: 'No sos cliente de este negocio' }, { status: 403 })
  }

  const [persona, org] = await Promise.all([
    query<{ nombre: string; email: string | null }>(
      `SELECT nombre, email FROM personas WHERE id = $1`, [persona_id]
    ),
    query<{ nombre: string; theme: string; logo_url: string | null }>(
      `SELECT nombre, theme, logo_url FROM organizations WHERE id = $1`, [org_id]
    ),
  ])

  if (!persona.rows[0] || !org.rows[0]) {
    return NextResponse.json({ error: 'Datos no encontrados' }, { status: 404 })
  }

  await createClienteSession({
    persona_id,
    org_id,
    contact_id: contact.rows[0].id,
    scope: 'full',
    origen: 'login',
    nombre: persona.rows[0].nombre,
    email: persona.rows[0].email,
    org_nombre: org.rows[0].nombre,
    org_theme: org.rows[0].theme,
    org_logo: org.rows[0].logo_url,
  })

  return NextResponse.json({ redirect: '/cliente/inicio' })
}
