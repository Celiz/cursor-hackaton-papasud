import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createClienteSession } from '@/lib/client-session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const result = await query<{
    id: string; org_id: string; persona_id: string; scope: string
    recurso_tipo: string | null; recurso_id: string | null
  }>(
    `UPDATE client_tokens
     SET accesos = accesos + 1, ultimo_acceso = NOW()
     WHERE token = $1 AND activo = true
     RETURNING id, org_id, persona_id, scope, recurso_tipo, recurso_id`,
    [token]
  )

  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Token invalido o expirado' }, { status: 404 })
  }

  const ct = result.rows[0]

  const [persona, org, contact] = await Promise.all([
    query<{ nombre: string; email: string | null }>(
      `SELECT nombre, email FROM personas WHERE id = $1`, [ct.persona_id]
    ),
    query<{ nombre: string; theme: string; logo_url: string | null }>(
      `SELECT nombre, theme, logo_url FROM organizations WHERE id = $1`, [ct.org_id]
    ),
    query<{ id: string }>(
      `SELECT id FROM org_contacts WHERE org_id = $1 AND persona_id = $2`, [ct.org_id, ct.persona_id]
    ),
  ])

  if (!persona.rows[0] || !org.rows[0] || !contact.rows[0]) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 404 })
  }

  await createClienteSession({
    persona_id: ct.persona_id,
    org_id: ct.org_id,
    contact_id: contact.rows[0].id,
    scope: ct.scope as 'full' | 'limited',
    recurso_tipo: ct.recurso_tipo || undefined,
    recurso_id: ct.recurso_id || undefined,
    origen: 'token',
    nombre: persona.rows[0].nombre,
    email: persona.rows[0].email,
    org_nombre: org.rows[0].nombre,
    org_theme: org.rows[0].theme,
    org_logo: org.rows[0].logo_url,
  })

  let redirect = '/cliente/inicio'
  if (ct.scope === 'limited' && ct.recurso_tipo && ct.recurso_id) {
    const routeMap: Record<string, string> = {
      orden: `/cliente/resultados/${ct.recurso_id}`,
      presupuesto: `/cliente/presupuestos/${ct.recurso_id}`,
      consentimiento: `/cliente/consentimientos/${ct.recurso_id}`,
    }
    redirect = routeMap[ct.recurso_tipo] || '/cliente/inicio'
  }

  return NextResponse.json({ redirect })
}
