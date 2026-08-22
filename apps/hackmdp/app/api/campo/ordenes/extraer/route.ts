import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { chat } from '@/lib/ai/ai-service'
import {
  construirPrompt,
  extraerJson,
  normalizarExtraccion,
  type Catalogos,
  type ExtraccionCruda,
} from '@/lib/campo/extraccion'

export const revalidate = 0

/**
 * Texto libre (dictado o escrito) → orden de trabajo estructurada.
 *
 * El modelo solo interpreta. Quién decide qué lote, qué tarea y qué insumo son
 * reales es `normalizarExtraccion`, contra los catálogos de la base.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { texto } = await request.json()
  if (!texto || typeof texto !== 'string' || texto.trim().length < 3) {
    return NextResponse.json({ error: 'Falta el texto a interpretar' }, { status: 400 })
  }

  const [parcelas, tareas, insumos] = await Promise.all([
    query(
      `SELECT id, codigo, nombre, superficie_ha FROM pap_parcelas
        WHERE org_id = $1 AND activo`,
      [session.org_id]
    ),
    query(
      `SELECT id, codigo, nombre, alias, requiere_insumos FROM pap_tareas_tipo
        WHERE org_id = $1 ORDER BY orden`,
      [session.org_id]
    ),
    query(
      `SELECT id, nombre, unidad, dosis_min, dosis_max, alias FROM pap_insumos
        WHERE org_id = $1 AND activo`,
      [session.org_id]
    ),
  ])

  const catalogos: Catalogos = {
    parcelas: parcelas.rows,
    tareas: tareas.rows,
    insumos: insumos.rows,
  }

  const hoy = new Date().toISOString().slice(0, 10)

  let cruda: ExtraccionCruda | null = null
  try {
    const respuesta = await chat(
      [
        {
          role: 'system',
          content:
            'Devolvés únicamente JSON válido. Sin explicaciones, sin bloque de código, sin texto alrededor.',
        },
        { role: 'user', content: construirPrompt(texto, catalogos, hoy) },
      ],
      { temperature: 0 }
    )
    cruda = extraerJson(typeof respuesta.content === 'string' ? respuesta.content : '')
  } catch (error) {
    console.error('[campo/extraer] error del modelo:', error)
    return NextResponse.json(
      { error: 'No se pudo interpretar el dictado. Probá de nuevo o cargalo a mano.' },
      { status: 502 }
    )
  }

  if (!cruda) {
    return NextResponse.json(
      { error: 'El modelo no devolvió una orden legible. Cargala a mano.' },
      { status: 502 }
    )
  }

  const orden = normalizarExtraccion(cruda, catalogos, hoy)

  return NextResponse.json({ orden, origen_texto: texto, cruda })
}
