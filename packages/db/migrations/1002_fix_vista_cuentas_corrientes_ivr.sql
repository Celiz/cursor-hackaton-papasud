-- Fix vista_cuentas_corrientes_ivr: usar facturas.total_pagado/saldo_pendiente
-- en vez de recomputar desde cobros_aplicaciones.
--
-- Bug previo: la vista calculaba total_cobrado y total_pendiente sumando solo
-- cobros_aplicaciones.monto_aplicado. En la práctica casi todos los cobros
-- (761 vs 1) van directos via cobros.factura_id sin pasar por la tabla
-- intermedia, así que aparecían como "0 cobros / Total Cobrado $0" aunque la
-- factura estuviera marcada como 'pagada'.
--
-- Fix: las columnas facturas.total_pagado y facturas.saldo_pendiente (esta
-- última GENERATED desde total_pagado) están mantenidas por trigger y son la
-- fuente de verdad. Sumamos esas. Para cantidad_cobros contamos distinct
-- cobros que apuntan a IVRs del cliente (factura_id directo + via aplicaciones).

CREATE OR REPLACE VIEW vista_cuentas_corrientes_ivr AS
SELECT c.id AS cliente_id,
       c.org_id,
       c.nombre,
       c.nombre_fantasia,
       c.identificador_unico,
       c.identificador_legacy,
       c.cuit,
       c.estado,
       COALESCE(ivr_totals.total_remitido, 0::numeric) AS total_remitido,
       COALESCE(ivr_totals.cantidad_ivr, 0::bigint) AS cantidad_ivr,
       COALESCE(ivr_totals.total_cobrado, 0::numeric) AS total_cobrado,
       COALESCE(cobro_totals.cantidad_cobros, 0::bigint) AS cantidad_cobros,
       COALESCE(ivr_totals.total_remitido, 0::numeric)
         - COALESCE(ivr_totals.total_cobrado, 0::numeric)
         - COALESCE(c.saldo_a_favor_ivr, 0::numeric)
         - COALESCE(nc_totals.total_nc, 0::numeric) AS saldo_actual,
       COALESCE(ivr_totals.total_pendiente, 0::numeric) AS total_pendiente,
       COALESCE(ivr_totals.cantidad_pendientes, 0::bigint) AS cantidad_pendientes,
       COALESCE(ivr_totals.total_cobrado_full, 0::numeric) AS total_cobrado_full,
       COALESCE(ivr_totals.cantidad_cobrados, 0::bigint) AS cantidad_cobrados,
       GREATEST(COALESCE(ivr_totals.ultima_emision, '1900-01-01'::date),
                COALESCE(cobro_totals.ultimo_cobro, '1900-01-01'::date)) AS ultima_actividad,
       COALESCE(c.saldo_a_favor_ivr, 0::numeric) AS saldo_a_favor_ivr,
       COALESCE(nc_totals.total_nc, 0::numeric) AS total_notas_credito,
       COALESCE(nc_totals.cantidad_nc, 0::bigint) AS cantidad_notas_credito,
       COALESCE(ivr_totals.total_vencido, 0::numeric) AS total_vencido,
       COALESCE(ivr_totals.cantidad_vencidas, 0::bigint) AS cantidad_vencidas,
       COALESCE(ivr_totals.total_no_vencido, 0::numeric) AS total_no_vencido,
       COALESCE(ivr_totals.cantidad_no_vencidas, 0::bigint) AS cantidad_no_vencidas
  FROM clientes c
  LEFT JOIN (
    -- Totales por cliente desde facturas IVR (usando columnas mantenidas por trigger)
    SELECT f.cliente_id,
           sum(f.total) AS total_remitido,
           count(f.id) AS cantidad_ivr,
           sum(COALESCE(f.total_pagado, 0)) AS total_cobrado,
           sum(
             CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                  THEN f.saldo_pendiente ELSE 0::numeric END
           ) AS total_pendiente,
           count(
             CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text]) THEN 1 END
           ) AS cantidad_pendientes,
           sum(
             CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                       AND f.fecha_vencimiento IS NOT NULL
                       AND f.fecha_vencimiento < CURRENT_DATE
                  THEN f.saldo_pendiente ELSE 0::numeric END
           ) AS total_vencido,
           count(
             CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                       AND f.fecha_vencimiento IS NOT NULL
                       AND f.fecha_vencimiento < CURRENT_DATE THEN 1 END
           ) AS cantidad_vencidas,
           sum(
             CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                       AND (f.fecha_vencimiento IS NULL OR f.fecha_vencimiento >= CURRENT_DATE)
                  THEN f.saldo_pendiente ELSE 0::numeric END
           ) AS total_no_vencido,
           count(
             CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                       AND (f.fecha_vencimiento IS NULL OR f.fecha_vencimiento >= CURRENT_DATE) THEN 1 END
           ) AS cantidad_no_vencidas,
           sum(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0::numeric END) AS total_cobrado_full,
           count(CASE WHEN f.estado = 'pagada' THEN 1 END) AS cantidad_cobrados,
           max(f.fecha_emision) AS ultima_emision
      FROM facturas f
     WHERE f.tipo_factura = 'IVR' AND f.estado <> 'anulada'
     GROUP BY f.cliente_id
  ) ivr_totals ON ivr_totals.cliente_id = c.id
  LEFT JOIN (
    -- Cantidad de cobros distintos y último cobro, considerando tanto cobros
    -- directos (cobros.factura_id) como aplicaciones (cobros_aplicaciones).
    SELECT cobros_por_cliente.cliente_id,
           count(DISTINCT cobros_por_cliente.cobro_id) AS cantidad_cobros,
           max(cobros_por_cliente.fecha_pago) AS ultimo_cobro
      FROM (
        SELECT f.cliente_id, co.id AS cobro_id, co.fecha_pago
          FROM cobros co
          JOIN facturas f ON co.factura_id = f.id AND f.tipo_factura = 'IVR'
        UNION
        SELECT f.cliente_id, co.id AS cobro_id, co.fecha_pago
          FROM cobros_aplicaciones ca
          JOIN cobros co ON co.id = ca.cobro_id
          JOIN facturas f ON ca.factura_id = f.id AND f.tipo_factura = 'IVR'
      ) cobros_por_cliente
     GROUP BY cobros_por_cliente.cliente_id
  ) cobro_totals ON cobro_totals.cliente_id = c.id
  LEFT JOIN (
    SELECT COALESCE(f.cliente_id, nc.cliente_id) AS cliente_id,
           sum(nc.monto) AS total_nc,
           count(nc.id) AS cantidad_nc
      FROM notas_credito nc
      LEFT JOIN facturas f ON nc.factura_id = f.id AND f.tipo_factura = 'IVR'
     WHERE nc.factura_id IS NOT NULL OR nc.cliente_id IS NOT NULL
     GROUP BY (COALESCE(f.cliente_id, nc.cliente_id))
  ) nc_totals ON nc_totals.cliente_id = c.id
 WHERE ivr_totals.cantidad_ivr > 0 OR c.saldo_a_favor_ivr > 0::numeric;
