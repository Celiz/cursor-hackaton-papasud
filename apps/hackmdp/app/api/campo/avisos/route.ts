import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { UMBRAL_CONFIANZA } from '@/lib/campo/vision'

export const revalidate = 0

/**
 * Un aviso es una foto que detectó un problema y todavía no revisó nadie.
 *
 * No es un estado aparte que haya que mantener sincronizado: se deriva de lo
 * que ya se guardó. Es aviso si el hallazgo NO es "sana" ni "no concluyente",
 * si la confianza llegó al umbral, y si nadie lo marcó revisado.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const incluirRevisados = new URL(request.url).searchParams.get('todos') === 'true'

  const { rows } = await query(
    `SELECT f.id, f.hallazgo, f.confianza::float8, f.urgente, f.miniatura,
            f.analisis_ia, f.tomada_at, f.tomada_por, f.latitud::float8, f.longitud::float8,
            f.revisado, f.revisado_por, f.revisado_at, f.resultado,
            EXTRACT(EPOCH FROM (now() - f.tomada_at))::int AS hace_seg,
            p.id AS parcela_id, p.codigo AS lote, p.pivote, p.tercio,
            p.superficie_ha::float8,
            e.nombre AS establecimiento
       FROM pap_ot_fotos f
       LEFT JOIN pap_parcelas p ON p.id = f.parcela_id
       LEFT JOIN pap_establecimientos e ON e.id = p.establecimiento_id
      WHERE f.org_id = $1
        AND f.hallazgo IS NOT NULL
        AND f.hallazgo NOT IN ('sana', 'no_concluyente')
        AND f.confianza >= $2
        AND ($3 OR f.revisado = false)
      ORDER BY f.urgente DESC, f.tomada_at DESC
      LIMIT 50`,
    [session.org_id, UMBRAL_CONFIANZA, incluirRevisados]
  )

  const abiertos = rows.filter((r) => !r.revisado)
  return NextResponse.json({
    avisos: rows,
    abiertos: abiertos.length,
    urgentes: abiertos.filter((r) => r.urgente).length,
  })
}

/** Marcar un aviso como revisado, con lo que se encontró al ir a mirar. */
export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, resultado, revisado_por, reabrir } = await request.json()
  if (!id) return NextResponse.json({ error: 'Falta el id del aviso' }, { status: 400 })

  const { rows } = await query(
    `UPDATE pap_ot_fotos SET
       revisado = $3,
       revisado_por = CASE WHEN $3 THEN $4 ELSE NULL END,
       revisado_at  = CASE WHEN $3 THEN now() ELSE NULL END,
       resultado    = CASE WHEN $3 THEN $5 ELSE NULL END
     WHERE id = $1 AND org_id = $2
     RETURNING id, revisado`,
    [id, session.org_id, !reabrir, revisado_por ?? null, resultado ?? null]
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, aviso: rows[0] })
}
