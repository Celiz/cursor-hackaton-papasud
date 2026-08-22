import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

/** Las fotos recientes, para que aparezcan en el plano a medida que se sacan. */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const limite = Number(new URL(request.url).searchParams.get('limite') ?? 30)

  const { rows } = await query(
    `SELECT f.id, f.latitud::float8, f.longitud::float8, f.tomada_at,
            f.tomada_por, f.dispositivo, f.hallazgo, f.confianza::float8,
            f.urgente, f.miniatura, f.analisis_ia,
            EXTRACT(EPOCH FROM (now() - f.tomada_at))::int AS hace_seg,
            p.codigo AS lote, p.pivote, p.cuadrante,
            p.anillo_desde::float8, p.anillo_hasta::float8
       FROM pap_ot_fotos f
       LEFT JOIN pap_parcelas p ON p.id = f.parcela_id
      WHERE f.org_id = $1
      ORDER BY f.tomada_at DESC
      LIMIT $2`,
    [session.org_id, Math.min(100, Math.max(1, limite))]
  )

  return NextResponse.json({ fotos: rows })
}
