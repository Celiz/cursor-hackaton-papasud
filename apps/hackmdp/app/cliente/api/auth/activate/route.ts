import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hash } from 'bcryptjs'
import { getClienteSession } from '@/lib/client-session'

export async function POST(request: NextRequest) {
  const session = await getClienteSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { password } = await request.json()
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'La contrasena debe tener al menos 6 caracteres' }, { status: 400 })
  }

  const existing = await query(
    `SELECT id FROM auth_credentials WHERE persona_id = $1`, [session.persona_id]
  )
  if (existing.rows[0]) {
    return NextResponse.json({ error: 'Ya tenes una cuenta activa' }, { status: 409 })
  }

  const persona = await query<{ email: string }>(
    `SELECT email FROM personas WHERE id = $1`, [session.persona_id]
  )
  if (!persona.rows[0]?.email) {
    return NextResponse.json({ error: 'Tu perfil no tiene email. Pedile al negocio que lo actualice.' }, { status: 400 })
  }

  const password_hash = await hash(password, 10)
  await query(
    `INSERT INTO auth_credentials (persona_id, email, password_hash) VALUES ($1, $2, $3)`,
    [session.persona_id, persona.rows[0].email, password_hash]
  )

  return NextResponse.json({ ok: true })
}
