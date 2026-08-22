import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { compare } from 'bcryptjs'
import { createClienteSession } from '@/lib/client-session'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contrasena requeridos' }, { status: 400 })
  }

  const cred = await query<{ id: string; persona_id: string; password_hash: string }>(
    `SELECT id, persona_id, password_hash FROM auth_credentials WHERE email = $1`, [email.toLowerCase()]
  )

  if (!cred.rows[0] || !await compare(password, cred.rows[0].password_hash)) {
    return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 })
  }

  const persona_id = cred.rows[0].persona_id

  const orgs = await query<{
    contact_id: string; org_id: string; org_nombre: string; org_theme: string; org_logo: string | null
  }>(
    `SELECT oc.id as contact_id, o.id as org_id, o.nombre as org_nombre, o.theme as org_theme, o.logo_url as org_logo
     FROM org_contacts oc
     JOIN organizations o ON o.id = oc.org_id
     WHERE oc.persona_id = $1 AND oc.tipo IN ('cliente', 'ambos')
     ORDER BY o.nombre`,
    [persona_id]
  )

  if (orgs.rows.length === 0) {
    return NextResponse.json({ error: 'No sos cliente de ningun negocio registrado' }, { status: 403 })
  }

  const persona = await query<{ nombre: string; email: string | null }>(
    `SELECT nombre, email FROM personas WHERE id = $1`, [persona_id]
  )

  if (orgs.rows.length === 1) {
    const org = orgs.rows[0]
    await createClienteSession({
      persona_id,
      org_id: org.org_id,
      contact_id: org.contact_id,
      scope: 'full',
      origen: 'login',
      nombre: persona.rows[0].nombre,
      email: persona.rows[0].email,
      org_nombre: org.org_nombre,
      org_theme: org.org_theme,
      org_logo: org.org_logo,
    })
    return NextResponse.json({ redirect: '/cliente/inicio' })
  }

  return NextResponse.json({
    requiresOrgSelection: true,
    persona_id,
    organizations: orgs.rows.map(o => ({
      org_id: o.org_id,
      nombre: o.org_nombre,
      theme: o.org_theme,
      logo: o.org_logo,
    })),
  })
}
