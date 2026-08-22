import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ubicarEnCampo } from '@/lib/campo/pivote'

export const revalidate = 0

/** Un dispositivo se considera en el campo si reportó en los últimos 45 segundos. */
const VENTANA_SEG = 45

/**
 * Reporta dónde está un teléfono.
 *
 * Es un upsert por dispositivo: una fila por teléfono que se pisa en cada
 * lectura. La ubicación dentro del pivote se resuelve acá y no en cada consulta
 * de la pantalla, que se llama muchas más veces.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const b = await request.json()
  const { dispositivo, nombre, latitud, longitud, precision_m, velocidad_ms, rumbo } = b

  if (!dispositivo || typeof latitud !== 'number' || typeof longitud !== 'number') {
    return NextResponse.json({ error: 'Faltan dispositivo, latitud o longitud' }, { status: 400 })
  }

  const { rows: pivotes } = await query(
    `SELECT nombre, latitud::float8, longitud::float8, radio_m::float8,
            cuadrante_base AS cuadrante_base
       FROM pap_pivotes WHERE org_id = $1`,
    [session.org_id]
  )

  const u = ubicarEnCampo(latitud, longitud, pivotes)

  // El lote sale del cuadrante y del anillo en el que cae el radio.
  let parcelaId: string | null = null
  if (u) {
    const { rows } = await query(
      `SELECT id FROM pap_parcelas
        WHERE org_id = $1 AND pivote = $2 AND cuadrante = $3
          AND $4::numeric BETWEEN anillo_desde AND anillo_hasta
        LIMIT 1`,
      [session.org_id, u.pivote, u.cuadrante, u.radio * 100]
    )
    parcelaId = rows[0]?.id ?? null
  }

  const { rows } = await query(
    `INSERT INTO pap_presencia
       (org_id, dispositivo, nombre, latitud, longitud, precision_m, velocidad_ms,
        rumbo, pivote, cuadrante, tercio, parcela_id, visto_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
     ON CONFLICT (org_id, dispositivo) DO UPDATE SET
       nombre = COALESCE(EXCLUDED.nombre, pap_presencia.nombre),
       latitud = EXCLUDED.latitud, longitud = EXCLUDED.longitud,
       precision_m = EXCLUDED.precision_m, velocidad_ms = EXCLUDED.velocidad_ms,
       rumbo = EXCLUDED.rumbo, pivote = EXCLUDED.pivote,
       cuadrante = EXCLUDED.cuadrante, tercio = EXCLUDED.tercio,
       parcela_id = EXCLUDED.parcela_id, visto_at = now()
     RETURNING id`,
    [session.org_id, dispositivo, nombre ?? null, latitud, longitud,
     precision_m ?? null, velocidad_ms ?? null, rumbo ?? null,
     u?.pivote ?? null, u?.cuadrante ?? null, u?.tercio ?? null, parcelaId]
  )

  return NextResponse.json({ ok: true, id: rows[0]?.id, ubicacion: u })
}

/** Quién está en el campo ahora. */
export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rows } = await query(
    `SELECT p.dispositivo, p.nombre, p.latitud::float8, p.longitud::float8,
            p.precision_m::float8, p.velocidad_ms::float8, p.rumbo::float8,
            p.pivote, p.cuadrante, p.tercio, p.visto_at,
            EXTRACT(EPOCH FROM (now() - p.visto_at))::int AS hace_seg,
            l.codigo AS lote
       FROM pap_presencia p
       LEFT JOIN pap_parcelas l ON l.id = p.parcela_id
      WHERE p.org_id = $1 AND p.visto_at > now() - ($2 || ' seconds')::interval
      ORDER BY p.visto_at DESC`,
    [session.org_id, VENTANA_SEG]
  )

  return NextResponse.json({ dispositivos: rows, ventana_seg: VENTANA_SEG })
}
