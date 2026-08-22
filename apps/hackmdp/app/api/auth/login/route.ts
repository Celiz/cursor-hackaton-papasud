import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { compare } from 'bcryptjs'
import { SignJWT } from 'jose'
import { query } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'locus-dev-secret-change-in-production'
)

// ORG_SLUG env var: when set, auto-selects this org (single-tenant mode)
const ORG_SLUG = process.env.ORG_SLUG || null

/**
 * Algunos usuarios prefieren aterrizar en una sección específica en vez del
 * dashboard general. Solo personalizado para Joaquin (Uno Electromedicina).
 */
export function getDefaultRedirect(nombre?: string | null, email?: string | null): string {
  const n = (nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const e = (email || '').toLowerCase()
  if (n.includes('joaqu') || e.startsWith('joaquin@')) return '/dashboard/crm'
  return '/dashboard'
}

export async function POST(request: Request) {
  try {
    const { email, password, hostname } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    // Resolve org slug from hostname via ORG_DOMAINS env
    // Format: "slug:domain,slug:domain"
    let domainOrgSlug: string | null = ORG_SLUG
    if (!domainOrgSlug && hostname) {
      const orgDomains = process.env.ORG_DOMAINS || ''
      for (const pair of orgDomains.split(',')) {
        const [slug, domain] = pair.split(':')
        if (domain && hostname.includes(domain)) {
          domainOrgSlug = slug
          break
        }
      }
    }

    // Find credentials by email or username
    const identifier = email.toLowerCase()
    const credResult = await query(
      `SELECT ac.id, ac.persona_id, ac.email, ac.username, ac.password_hash, p.nombre
       FROM auth_credentials ac
       JOIN personas p ON p.id = ac.persona_id
       WHERE ac.email = $1 OR ac.username = $1`,
      [identifier]
    )

    if (credResult.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const cred = credResult.rows[0]

    // Verify password
    const validPassword = await compare(password, cred.password_hash)
    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const cookieStore = await cookies()

    // If org slug resolved (via env or domain), auto-select that org
    if (domainOrgSlug) {
      const orgResult = await query(
        `SELECT o.id, o.nombre, o.slug, o.config->>'logo' as logo, o.config->>'theme' as theme, o.tipo, om.rol
         FROM org_members om
         JOIN organizations o ON o.id = om.org_id
         WHERE om.persona_id = $1 AND (o.slug = $2 OR o.slug LIKE $2 || '-%' OR o.slug LIKE '%' || $2 || '%')
         LIMIT 1`,
        [cred.persona_id, domainOrgSlug]
      )

      if (orgResult.rows.length === 0) {
        return NextResponse.json({ error: 'No tiene acceso a esta organización' }, { status: 403 })
      }

      const org = orgResult.rows[0]
      const isAdmin = org.rol === 'owner' || org.rol === 'admin'

      const modulosOcultosResult = await query(
        `SELECT COALESCE(permisos->'modulos_ocultos', '[]'::jsonb) AS modulos_ocultos,
                COALESCE(permisos->'modulos_solo_lectura', '[]'::jsonb) AS modulos_solo_lectura
         FROM org_members
         WHERE org_id = $1 AND persona_id = $2`,
        [org.id, cred.persona_id]
      )
      const modulos_ocultos = (modulosOcultosResult.rows[0]?.modulos_ocultos as string[] | null) ?? []
      const modulos_solo_lectura = (modulosOcultosResult.rows[0]?.modulos_solo_lectura as string[] | null) ?? []

      const token = await new SignJWT({
        sub: cred.id,
        persona_id: cred.persona_id,
        nombre: cred.nombre,
        email: cred.email,
        org_id: org.id,
        org_nombre: org.nombre,
        org_slug: org.slug,
        org_logo: org.logo,
        org_theme: org.theme || 'purple',
        org_tipo: org.tipo,

        rol: org.rol,
        is_admin: isAdmin,
        modulos_ocultos,
        modulos_solo_lectura,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET)

      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })

      await query(
        `UPDATE auth_credentials SET last_login = NOW() WHERE id = $1`,
        [cred.id]
      )

      return NextResponse.json({
        user: {
          id: cred.persona_id,
          persona_id: cred.persona_id,
          email: cred.email,
          nombre: cred.nombre,
        },
        requiresOrgSelection: false,
        redirectTo: getDefaultRedirect(cred.nombre, cred.email),
      })
    }

    // Multi-tenant: show org selector
    const orgsResult = await query(
      `SELECT o.id, o.nombre, o.slug, o.config->>'theme' as theme, o.tipo, om.rol
       FROM org_members om
       JOIN organizations o ON o.id = om.org_id
       WHERE om.persona_id = $1
       ORDER BY o.nombre`,
      [cred.persona_id]
    )
    const orgs = orgsResult.rows

    if (orgs.length === 0) {
      return NextResponse.json({ error: 'No tiene organizaciones asignadas' }, { status: 403 })
    }

    // Single org: auto-select
    if (orgs.length === 1) {
      const org = orgs[0]
      const isAdmin = org.rol === 'owner' || org.rol === 'admin'

      const modulosOcultosResult = await query(
        `SELECT COALESCE(permisos->'modulos_ocultos', '[]'::jsonb) AS modulos_ocultos,
                COALESCE(permisos->'modulos_solo_lectura', '[]'::jsonb) AS modulos_solo_lectura
         FROM org_members
         WHERE org_id = $1 AND persona_id = $2`,
        [org.id, cred.persona_id]
      )
      const modulos_ocultos = (modulosOcultosResult.rows[0]?.modulos_ocultos as string[] | null) ?? []
      const modulos_solo_lectura = (modulosOcultosResult.rows[0]?.modulos_solo_lectura as string[] | null) ?? []

      const token = await new SignJWT({
        sub: cred.id,
        persona_id: cred.persona_id,
        nombre: cred.nombre,
        email: cred.email,
        org_id: org.id,
        org_nombre: org.nombre,
        org_slug: org.slug,
        org_logo: null,
        org_theme: org.theme || 'purple',
        org_tipo: org.tipo,

        rol: org.rol,
        is_admin: isAdmin,
        modulos_ocultos,
        modulos_solo_lectura,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET)

      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })

      await query(
        `UPDATE auth_credentials SET last_login = NOW() WHERE id = $1`,
        [cred.id]
      )

      return NextResponse.json({
        user: {
          id: cred.persona_id,
          persona_id: cred.persona_id,
          email: cred.email,
          nombre: cred.nombre,
        },
        requiresOrgSelection: false,
        redirectTo: getDefaultRedirect(cred.nombre, cred.email),
      })
    }

    // Multiple orgs: require selection
    const token = await new SignJWT({
      sub: cred.id,
      persona_id: cred.persona_id,
      email: cred.email,
      nombre: cred.nombre,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    await query(
      `UPDATE auth_credentials SET last_login = NOW() WHERE id = $1`,
      [cred.id]
    )

    return NextResponse.json({
      user: {
        id: cred.persona_id,
        persona_id: cred.persona_id,
        email: cred.email,
        nombre: cred.nombre,
      },
      organizations: orgs,
      requiresOrgSelection: true,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }
}
