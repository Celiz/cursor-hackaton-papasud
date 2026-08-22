import { query } from '@/lib/db'
import type { MovimientoAgrupado, DetalleAplicacion } from './cuenta-corriente-ivr-format'

const SQL = `
WITH cobro_aplic AS (
  SELECT ca.cobro_id,
         jsonb_agg(jsonb_build_object('remito', f.nro_factura, 'monto', ca.monto_aplicado) ORDER BY f.nro_factura) AS detalle,
         sum(ca.monto_aplicado) AS total_aplicado
  FROM cobros_aplicaciones ca JOIN facturas f ON f.id = ca.factura_id
  GROUP BY ca.cobro_id
),
nc_aplic AS (
  SELECT na.nota_credito_id,
         jsonb_agg(jsonb_build_object('remito', f.nro_factura, 'monto', na.monto_aplicado) ORDER BY f.nro_factura) AS detalle,
         sum(na.monto_aplicado) AS total_aplicado
  FROM notas_credito_aplicaciones na JOIN facturas f ON f.id = na.factura_id
  GROUP BY na.nota_credito_id
),
mov AS (
  SELECT f.cliente_id, f.id::text AS movimiento_id, 'ivr' AS tipo, f.fecha_emision AS fecha,
         COALESCE(f.nro_factura, 'IVR-'||f.id::text) AS descripcion,
         f.total AS debito, 0::numeric AS credito, f.created_at, '[]'::jsonb AS detalle
  FROM facturas f
  WHERE f.cliente_id = $1 AND f.tipo_factura = 'IVR' AND f.estado <> 'anulada'
  UNION ALL
  SELECT co.cliente_id, co.id::text, 'cobro', co.fecha_pago,
         'Cobro' || COALESCE(' N°' || co.nro_pago, ''),
         0::numeric, co.monto, co.created_at,
         COALESCE(ca.detalle,
                  (SELECT jsonb_build_array(jsonb_build_object('remito', f2.nro_factura, 'monto', co.monto)) FROM facturas f2 WHERE f2.id = co.factura_id),
                  '[]'::jsonb)
         || CASE WHEN co.monto - COALESCE(ca.total_aplicado, co.monto) > 0.005
                 THEN jsonb_build_array(jsonb_build_object('remito', NULL, 'monto', co.monto - COALESCE(ca.total_aplicado, 0)))
                 ELSE '[]'::jsonb END
  FROM cobros co LEFT JOIN cobro_aplic ca ON ca.cobro_id = co.id
  WHERE co.cliente_id = $1
  UNION ALL
  SELECT COALESCE(f.cliente_id, nc.cliente_id), nc.id::text, 'nota_credito', COALESCE(nc.fecha, nc.created_at::date),
         'NC-' || COALESCE(nc.nro_nota, nc.id::text), 0::numeric, nc.monto, nc.created_at,
         COALESCE(na.detalle, '[]'::jsonb)
         || CASE WHEN nc.monto - COALESCE(na.total_aplicado, 0) > 0.005
                 THEN jsonb_build_array(jsonb_build_object('remito', NULL, 'monto', nc.monto - COALESCE(na.total_aplicado, 0)))
                 ELSE '[]'::jsonb END
  FROM notas_credito nc
  LEFT JOIN facturas f ON nc.factura_id = f.id AND f.tipo_factura = 'IVR'
  LEFT JOIN nc_aplic na ON na.nota_credito_id = nc.id
  WHERE COALESCE(f.cliente_id, nc.cliente_id) = $1
)
SELECT movimiento_id, tipo, fecha, descripcion, debito, credito,
       sum(debito - credito) OVER (ORDER BY fecha, created_at ROWS UNBOUNDED PRECEDING) AS saldo_acumulado,
       detalle
FROM mov
ORDER BY fecha, created_at
`

export async function movimientosIvrAgrupados(
  clienteId: string,
  orgId: string,
  opts?: { dias?: number }
): Promise<MovimientoAgrupado[]> {
  // El endpoint valida que el cliente pertenece a la org; guard extra por las dudas.
  const dueño = await query<{ ok: boolean }>(
    `SELECT (org_id = $2) AS ok FROM clientes WHERE id = $1`, [clienteId, orgId]
  )
  if (!dueño.rows[0]?.ok) return []

  const res = await query<any>(SQL, [clienteId])
  let filas = res.rows.map((r): MovimientoAgrupado => ({
    movimiento_id: r.movimiento_id,
    tipo: r.tipo,
    fecha: typeof r.fecha === 'string' ? r.fecha : new Date(r.fecha).toISOString().slice(0, 10),
    descripcion: r.descripcion,
    debito: Number(r.debito) || 0,
    credito: Number(r.credito) || 0,
    saldo_acumulado: Number(r.saldo_acumulado) || 0,
    detalle: (r.detalle as DetalleAplicacion[]).map(d => ({ remito: d.remito, monto: Number(d.monto) || 0 })),
  }))
  if (opts?.dias) {
    const desde = new Date(); desde.setDate(desde.getDate() - opts.dias)
    const iso = desde.toISOString().slice(0, 10)
    filas = filas.filter(f => f.fecha >= iso) // saldo_acumulado ya viene calculado sobre el histórico completo
  }
  return filas
}
