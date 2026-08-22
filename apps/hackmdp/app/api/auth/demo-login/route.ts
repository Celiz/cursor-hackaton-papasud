import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'
import { query } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'locus-dev-secret-change-in-production'
)

const DEMO_LOGIN_SECRET = process.env.DEMO_LOGIN_SECRET

export async function GET(request: NextRequest) {
  if (!DEMO_LOGIN_SECRET) {
    return NextResponse.json({ error: 'Demo login deshabilitado' }, { status: 403 })
  }

  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')
  const credEmail = url.searchParams.get('cred') || 'vetprueba'
  const redirect = url.searchParams.get('redirect') || '/dashboard/vet/pacientes'

  if (secret !== DEMO_LOGIN_SECRET) {
    return NextResponse.json({ error: 'Secret invalido' }, { status: 401 })
  }

  const credResult = await query(
    `SELECT ac.id, ac.persona_id, ac.email, p.nombre
     FROM auth_credentials ac
     JOIN personas p ON p.id = ac.persona_id
     WHERE ac.email = $1`,
    [credEmail]
  )

  if (credResult.rows.length === 0) {
    return NextResponse.json({ error: 'Credencial demo no encontrada' }, { status: 404 })
  }

  const cred = credResult.rows[0]

  const orgsResult = await query(
    `SELECT o.id, o.nombre, o.slug, o.config->>'logo' as logo, o.config->>'theme' as theme, o.tipo, om.rol,
            COALESCE(om.permisos->'modulos_ocultos', '[]'::jsonb) as modulos_ocultos,
            COALESCE(om.permisos->'modulos_solo_lectura', '[]'::jsonb) as modulos_solo_lectura
     FROM org_members om
     JOIN organizations o ON o.id = om.org_id
     WHERE om.persona_id = $1
     ORDER BY o.nombre LIMIT 1`,
    [cred.persona_id]
  )

  if (orgsResult.rows.length === 0) {
    return NextResponse.json({ error: 'Sin organizaciones para esta credencial' }, { status: 403 })
  }

  const org = orgsResult.rows[0]
  const isAdmin = org.rol === 'owner' || org.rol === 'admin'

  const token = await new SignJWT({
    sub: cred.id,
    persona_id: cred.persona_id,
    nombre: cred.nombre,
    email: cred.email,
    org_id: org.id,
    org_nombre: org.nombre,
    org_slug: org.slug,
    org_logo: org.logo,
    org_theme: org.theme || 'emerald',
    org_tipo: org.tipo,
    rol: org.rol,
    is_admin: isAdmin,
    modulos_ocultos: (org.modulos_ocultos as string[]) ?? [],
    modulos_solo_lectura: (org.modulos_solo_lectura as string[]) ?? [],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'app.aeterna.red'
  const isLocalhost = /^(localhost|127\.0\.0\.1)(:|$)/.test(host)

  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    // En produccion ponemos Secure salvo cuando el demo offline corre en localhost
    // (sin TLS local, el browser descarta cookies Secure y rompe el auto-login).
    secure: process.env.NODE_ENV === 'production' && !isLocalhost,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  await query(`UPDATE auth_credentials SET last_login = NOW() WHERE id = $1`, [cred.id])

  // Cloudflare termina TLS antes que Traefik, asi que x-forwarded-proto suele
  // venir "http". En produccion forzamos https excepto en localhost (demo offline).
  const proto = (process.env.NODE_ENV === 'production' && !isLocalhost)
    ? 'https'
    : (request.headers.get('x-forwarded-proto') || 'http')
  const target = new URL(redirect, `${proto}://${host}`)
  return NextResponse.redirect(target)
}
