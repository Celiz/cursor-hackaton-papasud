-- Fix vista_movimientos_ivr: incluir cobros que están vinculados a facturas via
-- cobros_aplicaciones (no solo los que tienen cobros.factura_id directo).
--
-- Bug previo: el UNION del cobro hacía JOIN co ON co.factura_id = f.id, por lo
-- que los cobros con factura_id=NULL y aplicaciones quedaban invisibles para
-- la vista de movimientos. Resultado: aparecían en la lista de cobros (UI) pero
-- NO en el historial de transacciones ni en el export Excel, y el saldo del
-- export divergía del saldo de la cuenta.
--
-- Regla unificada (evita double-count):
--   - Si el cobro tiene aplicaciones → usar 1 row por aplicación con
--     monto_aplicado, descripción con nro_factura aplicada.
--   - Si NO tiene aplicaciones → 1 row con cobros.monto y la factura directa.

CREATE OR REPLACE VIEW vista_movimientos_ivr AS
WITH movimientos AS (
  -- ============ IVR (débitos) ============
  SELECT f.cliente_id,
         f.id AS movimiento_id,
         'ivr'::text AS tipo_movimiento,
         f.fecha_emision AS fecha,
         concat('IVR-', COALESCE(f.nro_factura, f.id::text)) AS descripcion,
         f.total AS debito,
         0::numeric AS credito,
         f.estado,
         f.created_at
    FROM facturas f
   WHERE f.tipo_factura = 'IVR'
     AND f.estado <> 'anulada'

  UNION ALL

  -- ============ Cobros directos (sin aplicaciones) ============
  SELECT f.cliente_id,
         co.id AS movimiento_id,
         'cobro'::text AS tipo_movimiento,
         co.fecha_pago AS fecha,
         concat('Cobro IVR-', f.nro_factura) AS descripcion,
         0::numeric AS debito,
         co.monto AS credito,
         'aplicado'::text AS estado,
         co.created_at
    FROM cobros co
    JOIN facturas f ON f.id = co.factura_id AND f.tipo_factura = 'IVR'
   WHERE NOT EXISTS (SELECT 1 FROM cobros_aplicaciones ca WHERE ca.cobro_id = co.id)

  UNION ALL

  -- ============ Cobros distribuidos via cobros_aplicaciones ============
  SELECT f.cliente_id,
         ca.id AS movimiento_id,
         'cobro'::text AS tipo_movimiento,
         co.fecha_pago AS fecha,
         concat('Cobro IVR-', f.nro_factura) AS descripcion,
         0::numeric AS debito,
         ca.monto_aplicado AS credito,
         'aplicado'::text AS estado,
         co.created_at
    FROM cobros_aplicaciones ca
    JOIN cobros co ON co.id = ca.cobro_id
    JOIN facturas f ON f.id = ca.factura_id AND f.tipo_factura = 'IVR'

  UNION ALL

  -- ============ Notas de credito ============
  SELECT COALESCE(f.cliente_id, nc.cliente_id) AS cliente_id,
         nc.id AS movimiento_id,
         'nota_credito'::text AS tipo_movimiento,
         COALESCE(nc.fecha, nc.created_at::date) AS fecha,
         concat('NC-', COALESCE(nc.nro_nota, nc.id::text)) AS descripcion,
         0::numeric AS debito,
         nc.monto AS credito,
         'aplicada'::text AS estado,
         nc.created_at
    FROM notas_credito nc
    LEFT JOIN facturas f ON nc.factura_id = f.id AND f.tipo_factura = 'IVR'
   WHERE nc.factura_id IS NOT NULL OR nc.cliente_id IS NOT NULL
)
SELECT m.cliente_id,
       m.movimiento_id,
       m.tipo_movimiento,
       m.fecha,
       m.descripcion,
       m.debito,
       m.credito,
       m.estado,
       m.created_at,
       c.nombre AS cliente_nombre,
       c.nombre_fantasia AS cliente_nombre_fantasia,
       c.identificador_unico AS cliente_identificador,
       sum(m.debito - m.credito) OVER (
         PARTITION BY m.cliente_id
         ORDER BY m.fecha, m.created_at
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS saldo_acumulado
  FROM movimientos m
  JOIN clientes c ON c.id = m.cliente_id;
