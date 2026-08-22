import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const hostname = request.nextUrl.searchParams.get('hostname') || ''
  const orgDomains = process.env.ORG_DOMAINS || ''

  let slug: string | null = null
  for (const pair of orgDomains.split(',')) {
    const [s, domain] = pair.split(':')
    if (domain && hostname.includes(domain)) {
      slug = s
      break
    }
  }

  if (!slug) {
    return NextResponse.json({ org_id: null })
  }

  const result = await query(
    `SELECT o.id FROM organizations o
     JOIN org_members om ON om.org_id = o.id
     WHERE om.persona_id = $1 AND (o.slug = $2 OR o.slug LIKE $2 || '-%')
     LIMIT 1`,
    [session.persona_id, slug]
  )

  return NextResponse.json({ org_id: result.rows[0]?.id || null })
}
