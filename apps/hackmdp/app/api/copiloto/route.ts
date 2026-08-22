import { NextRequest, NextResponse } from 'next/server'
import { generateText, stepCountIs, tool } from 'ai'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { getGeminiModel } from '@/lib/ai/gemini-client'
import { validateQuery, ensureLimit, executeQuery } from '@/lib/ai/tools/query-database'

export const revalidate = 0

/**
 * Copiloto sobre el histórico productivo.
 *
 * El modelo NO recuerda los números: tiene una tool `ejecutar_consulta` para
 * correr SELECTs contra la base y VE el resultado (filas, o el error de
 * Postgres) en el mismo turno. Si erró la tabla o una columna no existe, se
 * lo decimos y puede corregir el SQL antes de responder — a diferencia del
 * flujo anterior (generar SQL a ciegas en un solo paso), acá se autocorrige.
 *
 * Tres candados sobre el SQL que escribe el modelo, aplicados en la tool:
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
  pap_movimientos(org_id, tipo, remito, fecha, variedad, lote, categoria, calibre, bolsas, kgs, kg_promedio,
                   transporte, destino, color_bolsa, color_hilo, dtv, observaciones)
    -- LOS "movimientos" son estos: despachos/recepciones de semilla (remitos, bolsas, kgs, transporte). 436 filas.
  depositos(org_id, codigo, nombre, tipo, ciudad)          -- las 4 ubicaciones de stock
  productos(org_id, codigo, nombre, categoria)             -- variedad x categoria de semilla
  stock_depositos(producto_id, deposito_id, cantidad_disponible, cantidad_reservada, cantidad_en_transito,
                   cantidad_cuarentena, cantidad_defectuosa, cantidad_total)  -- en KILOS
    -- OJO: stock_depositos NO tiene org_id. Para acotarlo a la organización hacé
    -- JOIN con productos (p.org_id) o depositos (d.org_id) y filtrá por esa columna.

Notas de dominio:
- El rendimiento se mide en toneladas por hectárea (t/ha). Un valor normal está entre 30 y 45.
- "campaña 2021" significa campana_anio = 2021 (el año de cosecha).
- 2009 y 2018 fueron campañas secas; 2012 tuvo exceso hídrico.
- Ya tenés acá el esquema completo: no consultes information_schema ni pg_catalog.
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
  const orgId = session.org_id

  const { pregunta } = await request.json()
  if (!pregunta || typeof pregunta !== 'string') {
    return NextResponse.json({ error: 'Falta la pregunta' }, { status: 400 })
  }

  // Última consulta que devolvió filas — es la que respalda la respuesta final.
  let ultimaConsulta: { sql: string; filas: Record<string, any>[]; rowCount: number } | null = null

  const ejecutarConsulta = tool({
    description:
      'Ejecuta una consulta SELECT contra la base de datos histórica de Papasud y devuelve las filas. ' +
      'Si la tabla o columna no existe, o el SQL es inválido, devuelve un error: leelo y corregí la consulta.',
    inputSchema: z.object({
      sql: z.string().describe('Consulta SQL de PostgreSQL. Debe empezar con SELECT.'),
    }),
    execute: async ({ sql }) => {
      const validacion = validateQuery(sql)
      if (!validacion.valid) {
        return { error: validacion.error }
      }

      const sqlSeguro = ensureLimit(forzarOrg(sql, orgId))
      const resultado = await executeQuery(sqlSeguro)
      if (!resultado.success) {
        return { error: resultado.error, sql: sqlSeguro }
      }

      const filas = resultado.data ?? []
      const rowCount = resultado.rowCount ?? filas.length
      ultimaConsulta = { sql: sqlSeguro, filas, rowCount }
      return { rowCount, filas: filas.slice(0, 60) }
    },
  })

  let texto = ''
  try {
    const resultado = await generateText({
      model: getGeminiModel(),
      temperature: 0,
      system:
        'Sos un analista de datos de Papasud, productora de semilla de papa. ' +
        'Para responder preguntas sobre el histórico productivo usás la tool `ejecutar_consulta`: ' +
        'escribís un SELECT de PostgreSQL, la corrés, y ves las filas (o el error) que devuelve. ' +
        'Si falla porque la tabla o columna no existe, o si las filas no responden la pregunta, ' +
        'corregí el SQL y volvé a llamar a la tool — no te quedes con el primer intento si está mal. ' +
        'Incluí siempre las columnas que identifican la fila (variedad, lote, campana_anio, ' +
        'establecimiento, según corresponda) además de la métrica pedida. Para valores típicos o ' +
        'totales usá agregados (avg, sum, count, min, max) con GROUP BY y redondeá con round(...::numeric, 2).\n\n' +
        'Cuando ya tengas los datos que necesitás, redactá la respuesta final: dos o tres oraciones, ' +
        'en español rioplatense, sin listas ni encabezados, usando EXCLUSIVAMENTE los números que ' +
        'devolvió la tool. No inventes ni redondees hacia valores "lindos". Si ninguna consulta ' +
        'devuelve datos que respondan la pregunta, decí que no hay datos disponibles.\n\n' + ESQUEMA,
      messages: [{ role: 'user', content: pregunta }],
      tools: { ejecutar_consulta: ejecutarConsulta },
      stopWhen: stepCountIs(4),
    })
    texto = resultado.text?.trim() ?? ''
  } catch (error) {
    console.error('[copiloto] error del modelo:', error)
    return NextResponse.json({ error: 'El modelo no respondió. Probá de nuevo.' }, { status: 502 })
  }

  if (!ultimaConsulta) {
    return NextResponse.json(
      { error: texto || 'No pude traducir esa pregunta a una consulta. Probá reformularla.' },
      { status: 422 }
    )
  }

  const { sql, filas, rowCount } = ultimaConsulta as { sql: string; filas: Record<string, any>[]; rowCount: number }

  if (filas.length === 0) {
    return NextResponse.json({
      respuesta: 'No hay datos que respondan a esa pregunta en el histórico.',
      sql,
      filas: [],
      rowCount: 0,
    })
  }

  return NextResponse.json({
    respuesta: texto || 'Consultá la tabla de abajo: son los datos que devolvió la consulta.',
    sql,
    filas,
    rowCount,
  })
}
