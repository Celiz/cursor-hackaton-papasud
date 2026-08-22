-- FIFO Cobros para Uno Electromedicina — replica el modelo de prod (Supabase)
-- donde pagos.factura_id es siempre NULL y la asignación se calcula on-the-fly
-- por orden cronológico de facturas.
--
-- Contexto:
-- En Supabase prod los 754 pagos de Uno tienen factura_id=NULL. La UI prod
-- computa qué IVRs están "pagados" en FIFO desde el saldo del cliente.
-- Cuando se importó a aeterna2, se inventó una asignación cobros.factura_id
-- por heurística que resultó incorrecta en 591/1054 facturas.
--
-- Este migration:
-- 1. Persiste cobros.cliente_id con el cliente correcto
-- 2. Limpia cobros.factura_id = NULL (no inventamos asignaciones)
-- 3. Recalcula facturas.total_pagado y estado en FIFO por cliente
-- 4. Recrea vista_cuentas_corrientes_ivr para sumar cobros directo por cliente
--
-- Solo aplica a Uno Electromedicina. Otras orgs quedan intactas.

DO $$
DECLARE
  uno_org_id uuid := '48b2a35a-0cb8-4643-a1d6-045918f9704c';
BEGIN

-- ============================================================
-- 1. Persistir cobros.cliente_id desde la factura si está faltante
-- ============================================================
UPDATE cobros co
   SET cliente_id = f.cliente_id
  FROM facturas f
 WHERE co.org_id = uno_org_id
   AND co.cliente_id IS NULL
   AND co.factura_id = f.id
   AND f.cliente_id IS NOT NULL;

-- ============================================================
-- 2. Limpiar cobros.factura_id (heurística incorrecta)
-- ============================================================
UPDATE cobros
   SET factura_id = NULL
 WHERE org_id = uno_org_id
   AND factura_id IS NOT NULL;

-- Limpiar también cobros_aplicaciones de Uno (las que existían eran residuales)
DELETE FROM cobros_aplicaciones ca
 USING cobros co
 WHERE ca.cobro_id = co.id AND co.org_id = uno_org_id;

-- ============================================================
-- 3. Recalcular facturas.total_pagado y estado en FIFO por cliente
-- ============================================================
WITH cobros_por_cliente AS (
  SELECT cliente_id, SUM(monto) AS total_cobrado
    FROM cobros
   WHERE org_id = uno_org_id AND cliente_id IS NOT NULL
   GROUP BY cliente_id
),
facturas_ranked AS (
  -- Cumsum de totales ordenando por fecha_emision asc (luego id como tiebreaker).
  -- cumsum_anterior = lo que tendría que cobrarse antes de llegar a esta factura.
  SELECT f.id,
         f.cliente_id,
         f.total,
         COALESCE(
           SUM(f.total) OVER (PARTITION BY f.cliente_id
                              ORDER BY f.fecha_emision, f.id
                              ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
           0
         ) AS cumsum_anterior
    FROM facturas f
   WHERE f.org_id = uno_org_id
     AND f.tipo_factura = 'IVR'
     AND f.estado <> 'anulada'
),
calculo AS (
  SELECT fr.id,
         fr.total,
         GREATEST(0, LEAST(fr.total, COALESCE(cpc.total_cobrado, 0) - fr.cumsum_anterior))
           AS pagado_calc
    FROM facturas_ranked fr
    LEFT JOIN cobros_por_cliente cpc ON cpc.cliente_id = fr.cliente_id
)
UPDATE facturas f
   SET total_pagado = c.pagado_calc,
       estado = CASE
         WHEN c.pagado_calc >= f.total THEN 'pagada'
         WHEN c.pagado_calc > 0 THEN 'parcial'
         ELSE 'pendiente'
       END
  FROM calculo c
 WHERE f.id = c.id;

-- ============================================================
-- 4. Recrear vista_cuentas_corrientes_ivr
--    Cambios vs version anterior (1002):
--    - total_cobrado / cantidad_cobros: sum/count directo de cobros por
--      cliente_id, sin depender de factura_id ni cobros_aplicaciones.
--    - total_pendiente / total_vencido: siguen usando facturas.saldo_pendiente
--      (que ahora está bien por FIFO).
-- ============================================================
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
    SELECT f.cliente_id,
           sum(f.total) AS total_remitido,
           count(f.id) AS cantidad_ivr,
           sum(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                THEN f.saldo_pendiente ELSE 0::numeric END) AS total_pendiente,
           count(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text]) THEN 1 END) AS cantidad_pendientes,
           sum(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                     AND f.fecha_vencimiento IS NOT NULL
                     AND f.fecha_vencimiento < CURRENT_DATE
                THEN f.saldo_pendiente ELSE 0::numeric END) AS total_vencido,
           count(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                       AND f.fecha_vencimiento IS NOT NULL
                       AND f.fecha_vencimiento < CURRENT_DATE THEN 1 END) AS cantidad_vencidas,
           sum(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                     AND (f.fecha_vencimiento IS NULL OR f.fecha_vencimiento >= CURRENT_DATE)
                THEN f.saldo_pendiente ELSE 0::numeric END) AS total_no_vencido,
           count(CASE WHEN f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text])
                       AND (f.fecha_vencimiento IS NULL OR f.fecha_vencimiento >= CURRENT_DATE) THEN 1 END) AS cantidad_no_vencidas,
           sum(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0::numeric END) AS total_cobrado_full,
           count(CASE WHEN f.estado = 'pagada' THEN 1 END) AS cantidad_cobrados,
           max(f.fecha_emision) AS ultima_emision
      FROM facturas f
     WHERE f.tipo_factura = 'IVR' AND f.estado <> 'anulada'
     GROUP BY f.cliente_id
  ) ivr_totals ON ivr_totals.cliente_id = c.id
  LEFT JOIN (
    SELECT co.cliente_id,
           SUM(co.monto) AS total_cobrado,
           COUNT(*) AS cantidad_cobros,
           MAX(co.fecha_pago) AS ultimo_cobro
      FROM cobros co
     WHERE co.cliente_id IS NOT NULL
     GROUP BY co.cliente_id
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

END $$;
