import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { query } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'locus-dev-secret-change-in-production'
)

// Helper to get persona_id from token
async function getPersonaId(token: string): Promise<string | null> {
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

  return personaId || null
}

// GET - List user's organizations
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const personaId = await getPersonaId(token)

    if (!personaId) {
      return NextResponse.json([])
    }

    const result = await query(
      `SELECT o.id, o.nombre, o.slug, o.logo_url, o.tipo, o.theme, om.rol
       FROM org_members om
       JOIN organizations o ON o.id = om.org_id
       WHERE om.persona_id = $1
       ORDER BY o.nombre`,
      [personaId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Get organizations error:', error)
    return NextResponse.json({ error: 'Error al obtener organizaciones' }, { status: 500 })
  }
}

// POST - Create new organization
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const personaId = await getPersonaId(token)

    if (!personaId) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 400 })
    }

    const { nombre, cuit, razon_social } = await request.json()

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Generate slug from nombre
    const slug = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check if slug exists
    const existingSlug = await query(
      'SELECT id FROM organizations WHERE slug = $1',
      [slug]
    )

    const finalSlug = existingSlug.rows.length > 0
      ? `${slug}-${Date.now().toString(36)}`
      : slug

    // Create organization
    const orgResult = await query(
      `INSERT INTO organizations (nombre, slug, cuit, razon_social)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, slug`,
      [nombre.trim(), finalSlug, cuit || null, razon_social || null]
    )

    const org = orgResult.rows[0]

    // Add creator as admin
    await query(
      `INSERT INTO org_members (persona_id, org_id, rol)
       VALUES ($1, $2, 'admin')`,
      [personaId, org.id]
    )

    const modulosOcultosResult = await query(
      `SELECT COALESCE(permisos->'modulos_ocultos', '[]'::jsonb) AS modulos_ocultos,
              COALESCE(permisos->'modulos_solo_lectura', '[]'::jsonb) AS modulos_solo_lectura
       FROM org_members
       WHERE org_id = $1 AND persona_id = $2`,
      [org.id, personaId]
    )
    const modulos_ocultos = (modulosOcultosResult.rows[0]?.modulos_ocultos as string[] | null) ?? []
    const modulos_solo_lectura = (modulosOcultosResult.rows[0]?.modulos_solo_lectura as string[] | null) ?? []

    // Update JWT with new org
    const newToken = await new SignJWT({
      sub: payload.sub,
      user_id: payload.user_id,
      persona_id: personaId,
      email: payload.email,
      nombre: payload.nombre,
      rol: 'admin',
      is_admin: true,
      org_id: org.id,
      org_nombre: org.nombre,
      org_slug: org.slug,
      modulos_ocultos,
      modulos_solo_lectura,
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

    return NextResponse.json(org)
  } catch (error) {
    console.error('Create organization error:', error)
    return NextResponse.json({ error: 'Error al crear organización' }, { status: 500 })
  }
}
