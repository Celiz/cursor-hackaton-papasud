import { query } from '@/lib/db'

/**
 * Motor de score de clientes (CRM).
 *
 * 5 factores ponderados (max 100):
 *   - Volumen de compras (30)  · percentil vs. todos los clientes del org
 *   - Frecuencia (20)          · facturas del último año / máximo
 *   - Puntualidad de pago (25) · facturas pagadas a tiempo
 *   - Antigüedad (15)          · días desde la primera factura
 *   - Satisfacción NPS (10)    · encuesta_respuestas
 *
 * Reglas (decididas con el usuario):
 *   - Un factor SIN datos no inventa ni penaliza: se marca `disponible: false`.
 *   - El score se RESCALA solo sobre los factores disponibles y se normaliza a 100.
 *   - `completitud` = suma de los `max` de los factores disponibles (0-100).
 *   - Si ningún factor tiene datos → score = null, categoria = 'Sin datos'.
 */

export interface FactorDetalle {
  score: number
  max: number
  disponible: boolean
  falta: string | null
  [extra: string]: unknown
}

export interface ScoreResult {
  score: number | null
  completitud: number
  categoria: string
  color: string
  detalle: Record<string, FactorDetalle>
  updated_at: string
}

function categoriaDe(score: number | null): { categoria: string; color: string } {
  if (score === null) return { categoria: 'Sin datos', color: 'gray' }
  if (score >= 80) return { categoria: 'Premium', color: 'purple' }
  if (score >= 60) return { categoria: 'Excelente', color: 'green' }
  if (score >= 40) return { categoria: 'Bueno', color: 'blue' }
  if (score >= 20) return { categoria: 'Regular', color: 'yellow' }
  return { categoria: 'En riesgo', color: 'red' }
}

/**
 * Calcula, persiste y devuelve el score de un cliente.
 * Devuelve null si el cliente no existe en el org.
 */
export async function calcularScoreCliente(
  clienteId: string,
  orgId: string,
): Promise<ScoreResult | null> {
  const chk = await query(`SELECT id FROM clientes WHERE id = $1 AND org_id = $2`, [clienteId, orgId])
  if (chk.rows.length === 0) return null

  // 1. VOLUMEN (30) — percentil real sobre todos los clientes del org
  const volRes = await query(
    `
    WITH ranked AS (
      SELECT cliente_id,
             SUM(total) AS total,
             PERCENT_RANK() OVER (ORDER BY SUM(total)) AS percentil
      FROM facturas
      WHERE cliente_id IS NOT NULL AND org_id = $2
      GROUP BY cliente_id
    )
    SELECT total, percentil FROM ranked WHERE cliente_id = $1
    `,
    [clienteId, orgId],
  )
  const tieneFacturas = volRes.rows.length > 0
  const totalCompras = tieneFacturas ? parseFloat(volRes.rows[0].total) || 0 : 0
  const percentilVolumen = tieneFacturas ? parseFloat(volRes.rows[0].percentil) || 0 : 0
  const scoreVolumen = Math.round(percentilVolumen * 30)

  // 2. FRECUENCIA (20) — facturas del último año / máximo del org
  const frecRes = await query(
    `
    WITH cliente_facturas AS (
      SELECT COUNT(*) AS cantidad
      FROM facturas
      WHERE cliente_id = $1 AND org_id = $2
        AND fecha_emision >= CURRENT_DATE - INTERVAL '1 year'
    ),
    max_facturas AS (
      SELECT COALESCE(MAX(cantidad), 1) AS maximo FROM (
        SELECT COUNT(*) AS cantidad
        FROM facturas
        WHERE org_id = $2 AND fecha_emision >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY cliente_id
      ) sub
    )
    SELECT cf.cantidad, mf.maximo FROM cliente_facturas cf, max_facturas mf
    `,
    [clienteId, orgId],
  )
  const cantidadFacturas = parseInt(frecRes.rows[0]?.cantidad) || 0
  const maxFacturas = parseInt(frecRes.rows[0]?.maximo) || 1
  const scoreFrecuencia = Math.round((cantidadFacturas / maxFacturas) * 20)

  // 3. PUNTUALIDAD (25) — % de facturas pagadas a tiempo, penalizando vencidas
  const puntRes = await query(
    `
    SELECT
      COUNT(*) FILTER (WHERE estado = 'pagada') AS pagadas,
      COUNT(*) FILTER (
        WHERE estado != 'pagada' AND fecha_vencimiento < CURRENT_DATE
      ) AS vencidas_sin_pagar,
      COUNT(*) AS total_facturas
    FROM facturas
    WHERE cliente_id = $1 AND org_id = $2
    `,
    [clienteId, orgId],
  )
  const pagadas = parseInt(puntRes.rows[0]?.pagadas) || 0
  const vencidasSinPagar = parseInt(puntRes.rows[0]?.vencidas_sin_pagar) || 0
  const totalFacturasCliente = parseInt(puntRes.rows[0]?.total_facturas) || 0
  let scorePuntualidad = 0
  if (totalFacturasCliente > 0) {
    const tasaPago = pagadas / totalFacturasCliente
    const penalizacion = (vencidasSinPagar / totalFacturasCliente) * 10
    scorePuntualidad = Math.max(0, Math.round(tasaPago * 25 - penalizacion))
  }

  // 4. ANTIGÜEDAD (15) — días desde la primera factura
  const antRes = await query(
    `
    SELECT (CURRENT_DATE - MIN(fecha_emision)) AS dias_cliente, MIN(fecha_emision) AS primera_compra
    FROM facturas WHERE cliente_id = $1 AND org_id = $2
    `,
    [clienteId, orgId],
  )
  const diasCliente = parseInt(antRes.rows[0]?.dias_cliente) || 0
  const primeraCompra = antRes.rows[0]?.primera_compra ?? null
  const scoreAntiguedad = Math.min(15, Math.round((diasCliente / 365) * 15))

  // 5. SATISFACCIÓN (10) — NPS de encuestas (sin org_id en la tabla; scope por cliente)
  const satRes = await query(
    `
    SELECT
      AVG(CASE
        WHEN (respuestas->0->>'valor')::int >= 9 THEN 100
        WHEN (respuestas->0->>'valor')::int >= 7 THEN 50
        ELSE 0
      END) AS nps_score,
      COUNT(*) AS total_encuestas
    FROM encuesta_respuestas
    WHERE cliente_id = $1 AND respuestas IS NOT NULL AND jsonb_array_length(respuestas) > 0
    `,
    [clienteId],
  )
  const totalEncuestas = parseInt(satRes.rows[0]?.total_encuestas) || 0
  const npsScore = parseFloat(satRes.rows[0]?.nps_score) || 0
  const scoreSatisfaccion = totalEncuestas > 0 ? Math.round((npsScore / 100) * 10) : 0

  const detalle: Record<string, FactorDetalle> = {
    volumen: {
      score: scoreVolumen, max: 30, disponible: tieneFacturas,
      falta: tieneFacturas ? null : 'Sin facturas vinculadas',
      total_compras: totalCompras, percentil: Math.round(percentilVolumen * 100),
    },
    frecuencia: {
      score: scoreFrecuencia, max: 20, disponible: tieneFacturas,
      falta: tieneFacturas ? null : 'Sin facturas vinculadas',
      facturas_ultimo_ano: cantidadFacturas,
    },
    puntualidad: {
      score: scorePuntualidad, max: 25, disponible: tieneFacturas,
      falta: tieneFacturas ? null : 'Sin facturas vinculadas',
      pagadas, vencidas_sin_pagar: vencidasSinPagar, total: totalFacturasCliente,
    },
    antiguedad: {
      score: scoreAntiguedad, max: 15, disponible: tieneFacturas,
      falta: tieneFacturas ? null : 'Sin facturas vinculadas',
      dias: diasCliente, primera_compra: primeraCompra,
    },
    satisfaccion: {
      score: scoreSatisfaccion, max: 10, disponible: totalEncuestas > 0,
      falta: totalEncuestas > 0 ? null : 'Sin encuestas NPS cargadas',
      encuestas: totalEncuestas, nps: Math.round(npsScore),
    },
  }

  // Rescalado sobre los factores disponibles
  const disponibles = Object.values(detalle).filter((f) => f.disponible)
  const maxDisponible = disponibles.reduce((s, f) => s + f.max, 0)
  const scoreDisponible = disponibles.reduce((s, f) => s + f.score, 0)

  const score = maxDisponible > 0 ? Math.round((scoreDisponible / maxDisponible) * 100) : null
  const completitud = maxDisponible // los max suman 100
  const { categoria, color } = categoriaDe(score)

  await query(
    `UPDATE clientes
        SET score = $1, completitud = $2, score_updated_at = NOW(), score_detalle = $3
      WHERE id = $4 AND org_id = $5`,
    [score, completitud, JSON.stringify(detalle), clienteId, orgId],
  )

  return { score, completitud, categoria, color, detalle, updated_at: new Date().toISOString() }
}
