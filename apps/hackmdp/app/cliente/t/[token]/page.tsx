import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { createClienteSession } from '@/lib/client-session'

export default async function TokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const result = await query(
    `UPDATE client_tokens
     SET accesos = accesos + 1, ultimo_acceso = NOW()
     WHERE token = $1 AND activo = true
     RETURNING id, org_id, persona_id, scope, recurso_tipo, recurso_id`,
    [token]
  )

  if (!result.rows[0]) {
    redirect('/cliente/login?error=token_invalido')
  }

  const ct = result.rows[0] as any

  const [persona, org, contact] = await Promise.all([
    query(`SELECT nombre, email FROM personas WHERE id = $1`, [ct.persona_id]),
    query(`SELECT nombre, theme, logo_url FROM organizations WHERE id = $1`, [ct.org_id]),
    query(`SELECT id FROM org_contacts WHERE org_id = $1 AND persona_id = $2`, [ct.org_id, ct.persona_id]),
  ])

  if (!persona.rows[0] || !org.rows[0] || !contact.rows[0]) {
    redirect('/cliente/login?error=datos_incompletos')
  }

  const p = persona.rows[0] as any
  const o = org.rows[0] as any

  await createClienteSession({
    persona_id: ct.persona_id,
    org_id: ct.org_id,
    contact_id: (contact.rows[0] as any).id,
    scope: ct.scope,
    recurso_tipo: ct.recurso_tipo || undefined,
    recurso_id: ct.recurso_id || undefined,
    origen: 'token',
    nombre: p.nombre,
    email: p.email,
    org_nombre: o.nombre,
    org_theme: o.theme,
    org_logo: o.logo_url,
  })

  if (ct.scope === 'limited' && ct.recurso_tipo && ct.recurso_id) {
    const routeMap: Record<string, string> = {
      orden: `/cliente/resultados/${ct.recurso_id}`,
      presupuesto: `/cliente/presupuestos/${ct.recurso_id}`,
      consentimiento: `/cliente/consentimientos/${ct.recurso_id}`,
    }
    redirect(routeMap[ct.recurso_tipo] || '/cliente/inicio')
  }

  redirect('/cliente/inicio')
}
