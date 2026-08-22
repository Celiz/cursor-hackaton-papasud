import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { query } from '@/lib/db'
import { getDefaultRedirect } from '../login/route'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'locus-dev-secret-change-in-production'
)

export async function POST(request: Request) {
  try {
    const { org_id } = await request.json()

    if (!org_id) {
      return NextResponse.json({ error: 'org_id requerido' }, { status: 400 })
    }

    // Get current token
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verify and decode token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    let personaId = payload.persona_id as string

    // If no persona_id in token, try to find it by email
    if (!personaId && payload.email) {
      const personaResult = await query(
        `SELECT id FROM personas WHERE $1 = ANY(email)`,
        [(payload.email as string).toLowerCase()]
      )
      personaId = personaResult.rows[0]?.id
    }

    if (!personaId) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 400 })
    }

    // Handle Locus personal space (virtual — no DB org needed)
    if (org_id === 'locus-personal') {
      const newToken = await new SignJWT({
        sub: payload.sub || personaId,
        user_id: payload.user_id,
        persona_id: personaId,
        nombre: payload.nombre as string,
        email: payload.email as string,
        org_id: `locus-${personaId}`,
        org_nombre: 'Locus',
        org_slug: 'locus',
        org_logo: null,
        org_theme: 'purple',
        org_tipo: 'locus',
        rol: 'owner',
        is_admin: true,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET)

      cookieStore.set('auth_token', newToken, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })

      return NextResponse.json({
        success: true,
        org: { id: 'locus-personal', nombre: 'Locus', slug: 'locus' },
        redirectTo: getDefaultRedirect(payload.nombre as string, payload.email as string),
      })
    }

    // Verify access to org
    const memberResult = await query(
      `SELECT om.*, o.nombre as org_nombre, o.slug as org_slug, o.logo_url as org_logo, COALESCE(o.config->>'theme', o.theme) as org_theme, o.tipo as org_tipo, o.config->>'pais' as org_pais
       FROM org_members om
       JOIN organizations o ON o.id = om.org_id
       WHERE om.persona_id = $1 AND om.org_id = $2`,
      [personaId, org_id]
    )

    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes acceso a esta organización' }, { status: 403 })
    }

    const member = memberResult.rows[0]

    const modulosOcultosResult = await query(
      `SELECT COALESCE(permisos->'modulos_ocultos', '[]'::jsonb) AS modulos_ocultos,
              COALESCE(permisos->'modulos_solo_lectura', '[]'::jsonb) AS modulos_solo_lectura
       FROM org_members
       WHERE org_id = $1 AND persona_id = $2`,
      [member.org_id, personaId]
    )
    const modulos_ocultos = (modulosOcultosResult.rows[0]?.modulos_ocultos as string[] | null) ?? []
    const modulos_solo_lectura = (modulosOcultosResult.rows[0]?.modulos_solo_lectura as string[] | null) ?? []

    // Create new token with org
    const newToken = await new SignJWT({
      sub: payload.sub || personaId,
      user_id: payload.user_id,
      persona_id: personaId,
      nombre: payload.nombre as string,
      email: payload.email as string,
      org_id: member.org_id,
      org_nombre: member.org_nombre,
      org_slug: member.org_slug,
      org_logo: member.org_logo,
      org_theme: member.org_theme || 'purple',
      org_tipo: member.org_tipo || 'other',
      org_pais: member.org_pais,
      rol: member.rol,
      is_admin: member.rol === 'owner' || member.rol === 'admin',
      modulos_ocultos,
      modulos_solo_lectura,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    // Set new cookie
    cookieStore.set('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({
      success: true,
      org: {
        id: member.org_id,
        nombre: member.org_nombre,
        slug: member.org_slug,
      },
      redirectTo: getDefaultRedirect(payload.nombre as string, payload.email as string),
    })
  } catch (error) {
    console.error('Select org error:', error)
    return NextResponse.json({ error: 'Error al seleccionar organización' }, { status: 500 })
  }
}
