-- Fix: el saldo a favor (excedente de cobros) no aparecia en Movimientos ni en
-- el export Excel de la cuenta corriente IVR.
--
-- Caso: un cobro cuyo monto supera la suma de sus aplicaciones (cobros_aplicaciones)
-- deja un remanente que se acredita como saldo a favor (clientes.saldo_a_favor_ivr).
-- La vista solo mostraba:
--   * rama "cobros directos": monto completo, pero solo para cobros SIN aplicaciones
--   * rama "cobros via aplicaciones": unicamente ca.monto_aplicado
-- Por lo tanto, para un cobro CON aplicaciones cuyo monto > suma aplicada, el
-- excedente desaparecia. Resultado: el Haber de la vista/Excel quedaba corto
-- exactamente por el saldo a favor, y el saldo acumulado no coincidia con el
-- "Saldo Actual" del resumen (que usa SUM(cobros.monto)).
--
-- Ejemplo real (FRANCO RAUL HERNAN): cobro de $591.627,08 aplicado $488.948,00
-- a IVR-001133 -> $102.679,08 de excedente que faltaba en el Haber.
--
-- Fix: agregar una rama que emite el remanente (monto - suma aplicada) de los
-- cobros que tienen aplicaciones, como un credito "Saldo a favor". Asi:
--   credito total por cobro = suma aplicaciones + remanente = monto (invariante)
-- y el saldo acumulado coincide con el resumen.

CREATE OR REPLACE VIEW vista_movimientos_ivr AS
WITH movimientos AS (
  -- ============ IVR (débitos) ============
  SELECT f.cliente_id,
         f.id AS movimiento_id,
         'ivr'::text AS tipo_movimiento,
         f.fecha_emision AS fecha,
         COALESCE(f.nro_factura, concat('IVR-', f.id::text))::text AS descripcion,
         f.total AS debito,
         0::numeric AS credito,
         f.estado,
         f.created_at
    FROM facturas f
   WHERE f.tipo_factura = 'IVR' AND f.estado <> 'anulada'

  UNION ALL

  -- ============ Cobros directos (sin aplicaciones) ============
  SELECT f.cliente_id,
         co.id AS movimiento_id,
         'cobro'::text AS tipo_movimiento,
         co.fecha_pago AS fecha,
         concat('Cobro ', f.nro_factura) AS descripcion,
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
         concat('Cobro ', f.nro_factura) AS descripcion,
         0::numeric AS debito,
         ca.monto_aplicado AS credito,
         'aplicado'::text AS estado,
         co.created_at
    FROM cobros_aplicaciones ca
    JOIN cobros co ON co.id = ca.cobro_id
    JOIN facturas f ON f.id = ca.factura_id AND f.tipo_factura = 'IVR'

  UNION ALL

  -- ============ Saldo a favor: excedente de cobros con aplicaciones ============
  -- Remanente = monto del cobro - suma de sus aplicaciones. Es el credito que
  -- quedo sin imputar a una factura y paso a saldo a favor del cliente.
  SELECT co.cliente_id,
         co.id AS movimiento_id,
         'cobro'::text AS tipo_movimiento,
         co.fecha_pago AS fecha,
         'Saldo a favor'::text AS descripcion,
         0::numeric AS debito,
         (co.monto - app.total_aplicado) AS credito,
         'aplicado'::text AS estado,
         co.created_at
    FROM cobros co
    JOIN (
      SELECT cobro_id, SUM(monto_aplicado) AS total_aplicado
        FROM cobros_aplicaciones
       GROUP BY cobro_id
    ) app ON app.cobro_id = co.id
   WHERE (co.monto - app.total_aplicado) > 0.005

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
