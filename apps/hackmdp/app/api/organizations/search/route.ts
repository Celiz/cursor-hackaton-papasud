import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const q = request.nextUrl.searchParams.get('q') || ''

    const result = await query(
      `SELECT id, nombre, slug, tipo
      FROM organizations
      WHERE nombre ILIKE $1
      ORDER BY nombre
      LIMIT 20`,
      [`%${q}%`]
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Error searching organizations:', error)
    return NextResponse.json(
      { error: 'Error al buscar organizaciones', details: error.message },
      { status: 500 }
    )
  }
}
