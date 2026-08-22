import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

/** Los números del panel de Papasud, en una sola consulta por bloque. */
export async function GET() {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const org = session.org_id

  const [campana, historia, lotes, ordenes, stock, conteo, variedades] = await Promise.all([
    // Campaña en curso
    query(
      `SELECT anio, nombre, superficie_ha, produccion_tn, lluvia_mm, dias_heladas,
              round((produccion_tn / NULLIF(superficie_ha, 0))::numeric, 1) AS rinde
         FROM pap_campanas WHERE org_id = $1 ORDER BY anio DESC LIMIT 1`,
      [org]
    ),
    // Serie de las últimas campañas, para el gráfico
    query(
      `SELECT anio, round(superficie_ha) AS superficie_ha, round(produccion_tn) AS produccion_tn,
              round((produccion_tn / NULLIF(superficie_ha, 0))::numeric, 1) AS rinde
         FROM pap_campanas WHERE org_id = $1 ORDER BY anio DESC LIMIT 12`,
      [org]
    ),
    // Lotes por estado, y los que quedaron sin actividad
    query(
      `SELECT p.estado, count(*)::int AS n, round(sum(p.superficie_ha)) AS ha,
              count(*) FILTER (
                WHERE NOT EXISTS (
                  SELECT 1 FROM pap_ordenes_trabajo o
                   WHERE o.parcela_id = p.id AND o.fecha > CURRENT_DATE - 21
                )
              )::int AS sin_actividad
         FROM pap_parcelas p
        WHERE p.org_id = $1 AND p.activo
        GROUP BY p.estado ORDER BY n DESC`,
      [org]
    ),
    // Últimas órdenes de trabajo
    query(
      `SELECT o.numero, o.tarea, o.fecha, o.estado, o.origen, o.responsable_nombre,
              p.codigo AS lote
         FROM pap_ordenes_trabajo o
         LEFT JOIN pap_parcelas p ON p.id = o.parcela_id
        WHERE o.org_id = $1
        ORDER BY o.fecha DESC, o.numero DESC LIMIT 8`,
      [org]
    ),
    // Stock por ubicación, en toneladas
    query(
      `SELECT d.nombre, d.codigo, d.tipo,
              round(COALESCE(sum(sd.cantidad_disponible), 0) / 1000.0, 1) AS toneladas,
              count(DISTINCT sd.producto_id)::int AS productos
         FROM depositos d
         LEFT JOIN stock_depositos sd ON sd.deposito_id = d.id
        WHERE d.org_id = $1 AND d.activo
        GROUP BY d.id ORDER BY toneladas DESC`,
      [org]
    ),
    // Conteo abierto con descuadres
    query(
      `SELECT c.numero, c.nombre, c.estado, c.total_items, c.items_con_diferencia,
              d.nombre AS deposito
         FROM conteos_ciclicos c
         JOIN depositos d ON d.id = c.deposito_id
        WHERE d.org_id = $1 AND c.estado <> 'cerrado'
        ORDER BY c.fecha_programada DESC LIMIT 1`,
      [org]
    ),
    // Las variedades que más se siembran, con su rinde
    query(
      `SELECT v.nombre, count(r.id)::int AS siembras,
              round(avg(r.rendimiento_tn_ha)::numeric, 1) AS rinde
         FROM pap_variedades v
         JOIN pap_rendimientos r ON r.variedad_id = v.id
        WHERE v.org_id = $1
        GROUP BY v.id ORDER BY siembras DESC LIMIT 6`,
      [org]
    ),
  ])

  return NextResponse.json({
    campana: campana.rows[0] ?? null,
    historia: historia.rows.reverse(),
    lotes: lotes.rows,
    ordenes: ordenes.rows,
    stock: stock.rows,
    conteo: conteo.rows[0] ?? null,
    variedades: variedades.rows,
  })
}
