-- Migración 994: separar IVRs vencidos vs no-vencidos en vista_cuentas_corrientes_ivr
--
-- Antes: todo IVR no pagado contaba como "deuda" indistintamente. La gente recibia
-- emails de cobranza por IVRs con fecha de vencimiento futura (no era deuda real).
--
-- Ahora: la vista expone total_vencido / cantidad_vencidas (fecha_vencimiento NOT NULL
-- AND fecha_vencimiento < CURRENT_DATE) separado de total_no_vencido / cantidad_no_vencidas
-- (fecha_vencimiento NULL o futura). Mantenemos total_pendiente / cantidad_pendientes
-- como suma total para no romper consumers existentes.

CREATE OR REPLACE VIEW vista_cuentas_corrientes_ivr AS
SELECT
  c.id AS cliente_id,
  c.org_id,
  c.nombre,
  c.nombre_fantasia,
  c.identificador_unico,
  c.identificador_legacy,
  c.cuit,
  c.estado,
  COALESCE(ivr_totals.total_remitido, 0::numeric) AS total_remitido,
  COALESCE(ivr_totals.cantidad_ivr, 0::bigint) AS cantidad_ivr,
  COALESCE(cobro_totals.total_cobrado, 0::numeric) AS total_cobrado,
  COALESCE(cobro_totals.cantidad_cobros, 0::bigint) AS cantidad_cobros,
  COALESCE(ivr_totals.total_remitido, 0::numeric)
    - COALESCE(cobro_totals.total_cobrado, 0::numeric)
    - COALESCE(c.saldo_a_favor_ivr, 0::numeric)
    - COALESCE(nc_totals.total_nc, 0::numeric) AS saldo_actual,
  COALESCE(ivr_totals.total_pendiente, 0::numeric) AS total_pendiente,
  COALESCE(ivr_totals.cantidad_pendientes, 0::bigint) AS cantidad_pendientes,
  COALESCE(ivr_totals.total_cobrado_full, 0::numeric) AS total_cobrado_full,
  COALESCE(ivr_totals.cantidad_cobrados, 0::bigint) AS cantidad_cobrados,
  GREATEST(
    COALESCE(ivr_totals.ultima_emision, '1900-01-01'::date),
    COALESCE(cobro_totals.ultimo_cobro, '1900-01-01'::date)
  ) AS ultima_actividad,
  COALESCE(c.saldo_a_favor_ivr, 0::numeric) AS saldo_a_favor_ivr,
  COALESCE(nc_totals.total_nc, 0::numeric) AS total_notas_credito,
  COALESCE(nc_totals.cantidad_nc, 0::bigint) AS cantidad_notas_credito,
  -- Nuevas columnas (al final por restricciones de CREATE OR REPLACE VIEW)
  COALESCE(ivr_totals.total_vencido, 0::numeric) AS total_vencido,
  COALESCE(ivr_totals.cantidad_vencidas, 0::bigint) AS cantidad_vencidas,
  COALESCE(ivr_totals.total_no_vencido, 0::numeric) AS total_no_vencido,
  COALESCE(ivr_totals.cantidad_no_vencidas, 0::bigint) AS cantidad_no_vencidas
FROM clientes c
LEFT JOIN (
  SELECT
    f.cliente_id,
    sum(f.total) AS total_remitido,
    count(f.id) AS cantidad_ivr,
    -- Pendiente total (vencido + no vencido)
    sum(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
             THEN f.total - COALESCE(fa.aplicado, 0::numeric)
             ELSE 0::numeric END) AS total_pendiente,
    count(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
               THEN 1 END) AS cantidad_pendientes,
    -- Vencidos: fecha_vencimiento NOT NULL y < hoy
    sum(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
              AND f.fecha_vencimiento IS NOT NULL
              AND f.fecha_vencimiento < CURRENT_DATE
             THEN f.total - COALESCE(fa.aplicado, 0::numeric)
             ELSE 0::numeric END) AS total_vencido,
    count(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                AND f.fecha_vencimiento IS NOT NULL
                AND f.fecha_vencimiento < CURRENT_DATE
               THEN 1 END) AS cantidad_vencidas,
    -- No vencidos: sin fecha_vencimiento o futura
    sum(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
              AND (f.fecha_vencimiento IS NULL OR f.fecha_vencimiento >= CURRENT_DATE)
             THEN f.total - COALESCE(fa.aplicado, 0::numeric)
             ELSE 0::numeric END) AS total_no_vencido,
    count(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                AND (f.fecha_vencimiento IS NULL OR f.fecha_vencimiento >= CURRENT_DATE)
               THEN 1 END) AS cantidad_no_vencidas,
    sum(CASE WHEN f.estado = 'pagada'::text THEN f.total ELSE 0::numeric END) AS total_cobrado_full,
    count(CASE WHEN f.estado = 'pagada'::text THEN 1 END) AS cantidad_cobrados,
    max(f.fecha_emision) AS ultima_emision
  FROM facturas f
  LEFT JOIN (
    SELECT cobros_aplicaciones.factura_id, sum(cobros_aplicaciones.monto_aplicado) AS aplicado
    FROM cobros_aplicaciones
    GROUP BY cobros_aplicaciones.factura_id
  ) fa ON fa.factura_id = f.id
  WHERE f.tipo_factura = 'IVR'::text AND f.estado <> 'anulada'::text
  GROUP BY f.cliente_id
) ivr_totals ON ivr_totals.cliente_id = c.id
LEFT JOIN (
  SELECT
    f.cliente_id,
    sum(ca.monto_aplicado) AS total_cobrado,
    count(DISTINCT co.id) AS cantidad_cobros,
    max(co.fecha_pago) AS ultimo_cobro
  FROM cobros_aplicaciones ca
  JOIN cobros co ON ca.cobro_id = co.id
  JOIN facturas f ON ca.factura_id = f.id AND f.tipo_factura = 'IVR'::text
  GROUP BY f.cliente_id
) cobro_totals ON cobro_totals.cliente_id = c.id
LEFT JOIN (
  SELECT
    COALESCE(f.cliente_id, nc.cliente_id) AS cliente_id,
    sum(nc.monto) AS total_nc,
    count(nc.id) AS cantidad_nc
  FROM notas_credito nc
  LEFT JOIN facturas f ON nc.factura_id = f.id AND f.tipo_factura = 'IVR'::text
  WHERE nc.factura_id IS NOT NULL OR nc.cliente_id IS NOT NULL
  GROUP BY COALESCE(f.cliente_id, nc.cliente_id)
) nc_totals ON nc_totals.cliente_id = c.id
WHERE ivr_totals.cantidad_ivr > 0 OR c.saldo_a_favor_ivr > 0::numeric;
