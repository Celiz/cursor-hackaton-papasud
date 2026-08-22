-- Migration: IVR surplus → saldo_a_favor_ivr
-- Backfill cobros_aplicaciones for legacy cobros and update vista to use aplicaciones
-- so that capping monto_aplicado + moving excess to saldo_a_favor_ivr doesn't double-count.

-- 1. Backfill cobros_aplicaciones for IVR cobros that don't have entries yet
INSERT INTO cobros_aplicaciones (cobro_id, factura_id, monto_aplicado)
SELECT co.id, co.factura_id, co.monto
FROM cobros co
JOIN facturas f ON co.factura_id = f.id AND f.tipo_factura = 'IVR'
WHERE co.factura_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cobros_aplicaciones ca WHERE ca.cobro_id = co.id
  )
ON CONFLICT (cobro_id, factura_id) DO NOTHING;

-- 2. Recreate vista_cuentas_corrientes_ivr using cobros_aplicaciones instead of cobros.monto
-- This avoids double-counting when excess is moved to saldo_a_favor_ivr
DROP VIEW IF EXISTS vista_cuentas_corrientes_ivr CASCADE;
CREATE VIEW vista_cuentas_corrientes_ivr AS
SELECT
  c.id AS cliente_id,
  c.org_id,
  c.nombre,
  c.nombre_fantasia,
  c.identificador_unico,
  c.identificador_legacy,
  c.cuit,
  c.estado,
  COALESCE(ivr_totals.total_remitido, 0) AS total_remitido,
  COALESCE(ivr_totals.cantidad_ivr, 0) AS cantidad_ivr,
  COALESCE(cobro_totals.total_cobrado, 0) AS total_cobrado,
  COALESCE(cobro_totals.cantidad_cobros, 0) AS cantidad_cobros,
  COALESCE(ivr_totals.total_remitido, 0)
    - COALESCE(cobro_totals.total_cobrado, 0)
    - COALESCE(c.saldo_a_favor_ivr, 0)
    - COALESCE(nc_totals.total_nc, 0) AS saldo_actual,
  COALESCE(ivr_totals.total_pendiente, 0) AS total_pendiente,
  COALESCE(ivr_totals.cantidad_pendientes, 0) AS cantidad_pendientes,
  COALESCE(ivr_totals.total_cobrado_full, 0) AS total_cobrado_full,
  COALESCE(ivr_totals.cantidad_cobrados, 0) AS cantidad_cobrados,
  GREATEST(
    COALESCE(ivr_totals.ultima_emision, '1900-01-01'),
    COALESCE(cobro_totals.ultimo_cobro, '1900-01-01')
  ) AS ultima_actividad,
  COALESCE(c.saldo_a_favor_ivr, 0) AS saldo_a_favor_ivr,
  COALESCE(nc_totals.total_nc, 0) AS total_notas_credito,
  COALESCE(nc_totals.cantidad_nc, 0) AS cantidad_notas_credito
FROM clientes c
LEFT JOIN (
  SELECT f.cliente_id,
    SUM(f.total) AS total_remitido,
    COUNT(f.id) AS cantidad_ivr,
    SUM(CASE WHEN f.estado IN ('pendiente','parcial') THEN f.total ELSE 0 END) AS total_pendiente,
    COUNT(CASE WHEN f.estado IN ('pendiente','parcial') THEN 1 ELSE NULL END) AS cantidad_pendientes,
    SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) AS total_cobrado_full,
    COUNT(CASE WHEN f.estado = 'pagada' THEN 1 ELSE NULL END) AS cantidad_cobrados,
    MAX(f.fecha_emision) AS ultima_emision
  FROM facturas f WHERE f.tipo_factura = 'IVR' AND f.estado != 'anulada'
  GROUP BY f.cliente_id
) ivr_totals ON ivr_totals.cliente_id = c.id
LEFT JOIN (
  SELECT f.cliente_id,
    SUM(ca.monto_aplicado) AS total_cobrado,
    COUNT(DISTINCT co.id) AS cantidad_cobros,
    MAX(co.fecha_pago) AS ultimo_cobro
  FROM cobros_aplicaciones ca
  JOIN cobros co ON ca.cobro_id = co.id
  JOIN facturas f ON ca.factura_id = f.id AND f.tipo_factura = 'IVR'
  GROUP BY f.cliente_id
) cobro_totals ON cobro_totals.cliente_id = c.id
LEFT JOIN (
  SELECT COALESCE(f.cliente_id, nc.cliente_id) AS cliente_id,
    SUM(nc.monto) AS total_nc,
    COUNT(nc.id) AS cantidad_nc
  FROM notas_credito nc
  LEFT JOIN facturas f ON nc.factura_id = f.id AND f.tipo_factura = 'IVR'
  WHERE nc.factura_id IS NOT NULL OR nc.cliente_id IS NOT NULL
  GROUP BY COALESCE(f.cliente_id, nc.cliente_id)
) nc_totals ON nc_totals.cliente_id = c.id
WHERE (ivr_totals.cantidad_ivr > 0 OR c.saldo_a_favor_ivr > 0);
