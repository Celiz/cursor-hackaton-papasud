import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { chat, type ContentPart } from '@/lib/ai/ai-service'
import {
  construirPromptVision,
  extraerJsonDiagnostico,
  normalizarDiagnostico,
} from '@/lib/campo/vision'

export const revalidate = 0

/** Más que esto no entra en un request ni hace falta para diagnosticar una hoja. */
const MAX_BYTES = 6 * 1024 * 1024

/**
 * Foto de un lote → observación agronómica.
 *
 * El modelo interpreta la imagen; `normalizarDiagnostico` decide qué se afirma
 * y qué se degrada a "no concluyente". Nada de esto dispara una aplicación:
 * genera una observación adjunta al lote.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let imagen: string | null = null
  let parcelaId: string | null = null
  let latitud: number | null = null
  let longitud: number | null = null
  let guardar = false

  const tipo = request.headers.get('content-type') ?? ''
  if (tipo.includes('application/json')) {
    const body = await request.json()
    imagen = body.imagen ?? null
    parcelaId = body.parcela_id ?? null
    latitud = body.latitud ?? null
    longitud = body.longitud ?? null
    guardar = Boolean(body.guardar)
  } else {
    const form = await request.formData()
    const file = form.get('foto') as File | null
    if (file) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: 'La foto pesa más de 6 MB. Sacala con menos resolución.' },
          { status: 413 }
        )
      }
      const buf = Buffer.from(await file.arrayBuffer())
      imagen = `data:${file.type || 'image/jpeg'};base64,${buf.toString('base64')}`
    }
    parcelaId = (form.get('parcela_id') as string) || null
    latitud = form.get('latitud') ? Number(form.get('latitud')) : null
    longitud = form.get('longitud') ? Number(form.get('longitud')) : null
    guardar = form.get('guardar') === 'true'
  }

  if (!imagen) {
    return NextResponse.json({ error: 'Falta la foto' }, { status: 400 })
  }
  if (!imagen.startsWith('data:image/') && !imagen.startsWith('http')) {
    return NextResponse.json({ error: 'Formato de imagen no reconocido' }, { status: 400 })
  }

  // Contexto del lote: la misma mancha no significa lo mismo en cualquier parte.
  let contexto = {}
  if (parcelaId) {
    const { rows } = await query(
      `SELECT p.codigo, p.pivote, p.tercio FROM pap_parcelas p
        WHERE p.id = $1 AND p.org_id = $2`,
      [parcelaId, session.org_id]
    )
    if (rows[0]) {
      contexto = {
        lote: rows[0].codigo,
        pivote: rows[0].pivote,
        tercio: rows[0].tercio,
        fecha: new Date().toISOString().slice(0, 10),
      }
    }
  }

  const partes: ContentPart[] = [
    { type: 'text', text: construirPromptVision(contexto) },
    { type: 'image_url', image_url: { url: imagen, detail: 'high' } },
  ]

  let crudo: ReturnType<typeof extraerJsonDiagnostico> = null
  try {
    const respuesta = await chat(
      [{ role: 'user', content: partes }],
      { temperature: 0 }
    )
    crudo = extraerJsonDiagnostico(
      typeof respuesta.content === 'string' ? respuesta.content : ''
    )
  } catch (error) {
    console.error('[campo/foto] error del modelo:', error)
    return NextResponse.json(
      { error: 'No se pudo analizar la foto. Probá de nuevo.' },
      { status: 502 }
    )
  }

  if (!crudo) {
    return NextResponse.json(
      { error: 'El modelo no devolvió un diagnóstico legible.' },
      { status: 502 }
    )
  }

  const diagnostico = normalizarDiagnostico(crudo)

  // Se guarda solo si lo piden: analizar es barato, acumular fotos no.
  let fotoId: string | null = null
  if (guardar) {
    const resumen = [
      diagnostico.etiqueta,
      diagnostico.severidad ? `severidad ${diagnostico.severidad}` : null,
      `confianza ${(diagnostico.confianza * 100).toFixed(0)}%`,
      diagnostico.visible,
      diagnostico.observacion,
    ].filter(Boolean).join(' · ')

    const { rows } = await query(
      `INSERT INTO pap_ot_fotos (org_id, parcela_id, url, latitud, longitud, tomada_at, analisis_ia)
       VALUES ($1, $2, $3, $4, $5, now(), $6) RETURNING id`,
      [session.org_id, parcelaId, imagen.slice(0, 120) + '…', latitud, longitud, resumen]
    )
    fotoId = rows[0]?.id ?? null
  }

  return NextResponse.json({ diagnostico, foto_id: fotoId, crudo })
}
