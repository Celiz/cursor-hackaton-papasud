import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') || ''
  if (q.length < 2) return NextResponse.json([])

  const orgId = session.org_id
  const searchTerm = `%${q}%`
  const phoneSuffix = q.replace(/\D/g, '')

  const result = await query(`
    SELECT
      p.id as persona_id,
      oc.id as contact_id,
      COALESCE(p.nombre || ' ' || COALESCE(p.apellido, ''), p.nombre) as nombre,
      p.email,
      p.telefono,
      oc.tipo
    FROM org_contacts oc
    JOIN personas p ON p.id = oc.persona_id
    WHERE oc.org_id = $1
      AND (
        p.nombre ILIKE $2
        OR p.apellido ILIKE $2
        OR p.email ILIKE $2
        OR (length($3) >= 4 AND RIGHT(REGEXP_REPLACE(p.telefono, '[^0-9]', '', 'g'), 10) LIKE '%' || $3 || '%')
      )
    ORDER BY p.nombre
    LIMIT 10
  `, [orgId, searchTerm, phoneSuffix])

  return NextResponse.json(result.rows)
}
