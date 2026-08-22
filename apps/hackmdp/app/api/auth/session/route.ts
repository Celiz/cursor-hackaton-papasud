import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      id: session.id,
      personaId: session.persona_id,
      email: session.email,
      name: session.nombre,
      role: session.rol,
      isAdmin: session.is_admin,
      orgId: session.org_id,
      orgName: session.org_nombre,
      orgLogo: session.org_logo,
      orgTheme: session.org_theme,
      orgTipo: session.org_tipo,
      orgPais: session.org_pais,
      modulosOcultos: session.modulos_ocultos ?? [],
      modulosSoloLectura: session.modulos_solo_lectura ?? [],
    }
  })
}
