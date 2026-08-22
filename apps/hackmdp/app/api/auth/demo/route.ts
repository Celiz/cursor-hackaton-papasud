import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'
import { query } from '@/lib/db'
import { origenPublico } from '@/lib/base-url'

export const revalidate = 0

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'locus-dev-secret-change-in-production'
)

/**
 * Auto-login de demo: entra directo como el usuario de Papasud, sin pantalla de login.
 *
 * No es un bypass de la sesión — firma el MISMO JWT que emite /api/auth/login, con
 * el org_id, el rol y los modulos_ocultos reales. Todo lo que corre después
 * (consultas por organización, permisos, sidebar) funciona igual que con login.
 *
 * Se activa solo con DEMO_AUTOLOGIN=true. Sin esa variable devuelve 404, así que
 * no queda una puerta abierta si esto alguna vez se despliega.
 */
export async function GET(request: NextRequest) {
  if (process.env.DEMO_AUTOLOGIN !== 'true') {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const email = process.env.DEMO_USER_EMAIL || 'demo@papasud.com.ar'
  const slug = process.env.ORG_SLUG || 'papasud'
  const destino = request.nextUrl.searchParams.get('next') || '/dashboard'

  const cred = await query(
    `SELECT ac.id, ac.persona_id, ac.email, p.nombre
       FROM auth_credentials ac
       JOIN personas p ON p.id = ac.persona_id
      WHERE ac.email = $1`,
    [email]
  )
  if (cred.rows.length === 0) {
    return NextResponse.json(
      { error: `No existe el usuario de demo ${email}. Corré la migración 1201.` },
      { status: 500 }
    )
  }
  const c = cred.rows[0]

  const org = await query(
    `SELECT o.id, o.nombre, o.slug, o.config->>'logo' AS logo,
            o.config->>'theme' AS theme, o.tipo, om.rol,
            COALESCE(om.permisos->'modulos_ocultos', '[]'::jsonb)       AS modulos_ocultos,
            COALESCE(om.permisos->'modulos_solo_lectura', '[]'::jsonb)  AS modulos_solo_lectura
       FROM org_members om
       JOIN organizations o ON o.id = om.org_id
      WHERE om.persona_id = $1 AND o.slug = $2
      LIMIT 1`,
    [c.persona_id, slug]
  )
  if (org.rows.length === 0) {
    return NextResponse.json(
      { error: `El usuario de demo no es miembro de la organización "${slug}".` },
      { status: 500 }
    )
  }
  const o = org.rows[0]

  const token = await new SignJWT({
    sub: c.id,
    persona_id: c.persona_id,
    nombre: c.nombre,
    email: c.email,
    org_id: o.id,
    org_nombre: o.nombre,
    org_slug: o.slug,
    org_logo: o.logo,
    org_theme: o.theme || 'emerald',
    org_tipo: o.tipo,
    rol: o.rol,
    is_admin: o.rol === 'owner' || o.rol === 'admin',
    modulos_ocultos: o.modulos_ocultos ?? [],
    modulos_solo_lectura: o.modulos_solo_lectura ?? [],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  // Se vuelve al destino sobre el origen PÚBLICO, no sobre nextUrl.origin: detrás
  // de un túnel ese origen es localhost y sacaría al visitante del túnel.
  return NextResponse.redirect(new URL(destino, origenPublico(request)))
}
