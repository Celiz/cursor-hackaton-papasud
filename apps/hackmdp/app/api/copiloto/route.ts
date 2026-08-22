import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { chat } from '@/lib/ai/ai-service'
import { extractSqlFromResponse, validateQuery, ensureLimit, executeQuery } from '@/lib/ai/tools/query-database'

export const revalidate = 0

/**
 * Copiloto sobre el histórico productivo.
 *
 * El modelo NO recuerda los números: escribe una consulta, la consulta corre
 * contra la base, y la respuesta se redacta sobre las filas que volvieron. Si la
 * consulta no devuelve nada, se dice que no hay datos — no se completa el hueco.
 *
 * Tres candados sobre el SQL que escribe el modelo:
 *   1. `validateQuery` rechaza todo lo que no sea un SELECT.
 *   2. Se fuerza el filtro de organización, así no se puede leer otra empresa.
 *   3. `ensureLimit` acota la cantidad de filas.
 */

const ESQUEMA = `
Vista principal (usala salvo que necesites otra cosa) — vista_pap_historico:
  org_id, campana_anio (int), campana (texto "2025/26"), lote (texto "Lote 8"),
  lote_nombre, establecimiento, localidad, variedad, variedad_ciclo, variedad_destino,
  categoria_semilla, superficie_ha, produccion_tn, rendimiento_tn_ha,
  fecha_siembra, fecha_cosecha, lluvia_mm, temp_media_c, dias_heladas,
  calibre_medio_mm, descarte_pct, observaciones

Otras tablas:
  pap_campanas(org_id, anio, nombre, superficie_ha, produccion_tn, lluvia_mm, temp_media_c, dias_heladas, notas)
  pap_parcelas(org_id, codigo, nombre, superficie_ha, estado, tiene_riego, tipo_suelo, establecimiento_id)
  pap_establecimientos(org_id, nombre, localidad, superficie_ha)
  pap_variedades(org_id, nombre, ciclo, destino, notas)
  pap_ordenes_trabajo(org_id, numero, parcela_id, tarea, fecha, responsable_nombre, maquinaria, horas, estado, origen, origen_texto)
  pap_insumos(org_id, nombre, tipo, principio_activo, unidad, dosis_min, dosis_max)
  depositos(org_id, codigo, nombre, tipo, ciudad)          -- las 4 ubicaciones de stock
  productos(org_id, codigo, nombre, categoria)             -- variedad x categoria de semilla
  stock_depositos(producto_id, deposito_id, cantidad_disponible, cantidad_reservada)  -- en KILOS

Notas de dominio:
- El rendimiento se mide en toneladas por hectárea (t/ha). Un valor normal está entre 30 y 45.
- "campaña 2021" significa campana_anio = 2021 (el año de cosecha).
- 2009 y 2018 fueron campañas secas; 2012 tuvo exceso hídrico.
`

function forzarOrg(sql: string, orgId: string): string {
  // El modelo puede olvidarse del filtro de organización. Se agrega siempre.
  const tieneWhere = /\bwhere\b/i.test(sql)
  const filtro = `org_id = '${orgId}'`
  if (sql.includes(filtro)) return sql

  if (tieneWhere) {
    return sql.replace(/\bwhere\b/i, `WHERE ${filtro} AND `)
  }
  // Sin WHERE: insertarlo antes de GROUP BY / ORDER BY / LIMIT, o al final.
  const corte = sql.search(/\b(group\s+by|order\s+by|limit)\b/i)
  if (corte === -1) return `${sql.replace(/;?\s*$/, '')} WHERE ${filtro}`
  return `${sql.slice(0, corte)} WHERE ${filtro} ${sql.slice(corte)}`
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { pregunta } = await request.json()
  if (!pregunta || typeof pregunta !== 'string') {
    return NextResponse.json({ error: 'Falta la pregunta' }, { status: 400 })
  }

  // ── 1. El modelo escribe la consulta ──────────────────────────────────────
  let sql: string | null = null
  try {
    const respuesta = await chat(
      [
        {
          role: 'system',
          content:
            'Sos un analista de datos de Papasud, productora de semilla de papa. ' +
            'Traducís preguntas en español a UNA consulta SQL de PostgreSQL. ' +
            'Respondés SOLO con la consulta, sin explicación y sin bloque de código. ' +
            'Usá siempre SELECT. Nunca modifiques datos.\n' +
            'Incluí SIEMPRE las columnas que identifican la fila (variedad, lote, campana_anio, ' +
            'establecimiento, según corresponda) además de la métrica, para que la respuesta se ' +
            'pueda redactar sin ambigüedad. Cuando la pregunta pida un valor típico o un total, ' +
            'usá agregados (avg, sum, count, min, max) con GROUP BY y redondeá con round(...::numeric, 2).\n\n' + ESQUEMA,
        },
        { role: 'user', content: pregunta },
      ],
      { temperature: 0 }
    )
    sql = extractSqlFromResponse(typeof respuesta.content === 'string' ? respuesta.content : '')
  } catch (error) {
    console.error('[copiloto] error del modelo al escribir SQL:', error)
    return NextResponse.json({ error: 'El modelo no respondió. Probá de nuevo.' }, { status: 502 })
  }

  if (!sql) {
    return NextResponse.json(
      { error: 'No pude traducir esa pregunta a una consulta. Probá reformularla.' },
      { status: 422 }
    )
  }

  const validacion = validateQuery(sql)
  if (!validacion.valid) {
    return NextResponse.json({ error: validacion.error, sql }, { status: 422 })
  }

  sql = ensureLimit(forzarOrg(sql, session.org_id))

  // ── 2. La consulta corre contra la base ───────────────────────────────────
  const resultado = await executeQuery(sql)
  if (!resultado.success) {
    return NextResponse.json(
      { error: `La consulta falló: ${resultado.error}`, sql },
      { status: 422 }
    )
  }

  const filas = resultado.data ?? []

  if (filas.length === 0) {
    return NextResponse.json({
      respuesta: 'No hay datos que respondan a esa pregunta en el histórico.',
      sql,
      filas: [],
      rowCount: 0,
    })
  }

  // ── 3. Se redacta la respuesta SOBRE las filas, no sobre la memoria ───────
  let respuestaTexto = ''
  try {
    const redaccion = await chat(
      [
        {
          role: 'system',
          content:
            'Redactás la respuesta usando EXCLUSIVAMENTE las filas que te paso. ' +
            'No agregues números que no estén en los datos. No estimes ni redondees hacia valores "lindos". ' +
            'Respondé en dos o tres oraciones, en español rioplatense, sin listas ni encabezados. ' +
            'Si los datos no alcanzan para responder, decilo.',
        },
        {
          role: 'user',
          content:
            `Pregunta: ${pregunta}\n\n` +
            `Consulta que se ejecutó (te dice qué significa cada columna):\n${sql}\n\n` +
            `Filas (${filas.length}):\n${JSON.stringify(filas.slice(0, 60))}`,
        },
      ],
      { temperature: 0.2 }
    )
    respuestaTexto = typeof redaccion.content === 'string' ? redaccion.content.trim() : ''
  } catch (error) {
    console.error('[copiloto] error al redactar:', error)
  }

  return NextResponse.json({
    respuesta: respuestaTexto || 'Consultá la tabla de abajo: son los datos que devolvió la consulta.',
    sql,
    filas,
    rowCount: resultado.rowCount ?? filas.length,
  })
}
