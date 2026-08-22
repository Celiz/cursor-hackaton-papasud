import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

/** El "Excel de 20 años", ya normalizado y filtrable. */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const params: unknown[] = [session.org_id]
  let where = 'org_id = $1'

  for (const [campo, valor] of [
    ['variedad', searchParams.get('variedad')],
    ['establecimiento', searchParams.get('establecimiento')],
    ['lote', searchParams.get('lote')],
  ] as const) {
    if (valor) {
      params.push(valor)
      where += ` AND ${campo} = $${params.length}`
    }
  }
  const anio = searchParams.get('anio')
  if (anio) {
    params.push(Number(anio))
    where += ` AND campana_anio = $${params.length}`
  }

  const { rows } = await query(
    `SELECT * FROM vista_pap_historico
      WHERE ${where}
      ORDER BY campana_anio DESC, lote`,
    params
  )
  return NextResponse.json({ filas: rows })
}
