-- Fix doble-conteo en saldo_actual de vista_cuentas_corrientes_ivr.
-- saldo_a_favor_ivr ya está incluido en cobro_totals.total_cobrado (sum de
-- cobros.monto), así que restarlo de nuevo lo contaba dos veces. Se expone
-- con el primer adelanto/cobro a cuenta puro (saldo a favor = monto completo).
-- saldo_actual = total_remitido - total_cobrado - total_nc.
CREATE OR REPLACE VIEW vista_cuentas_corrientes_ivr AS
 WITH nc_totals AS (
         SELECT COALESCE(f.cliente_id, nc.cliente_id) AS cliente_id,
            sum(nc.monto) AS total_nc,
            count(nc.id) AS cantidad_nc
           FROM notas_credito nc
             LEFT JOIN facturas f ON nc.factura_id = f.id AND f.tipo_factura = 'IVR'::text
          WHERE nc.factura_id IS NOT NULL OR nc.cliente_id IS NOT NULL
          GROUP BY (COALESCE(f.cliente_id, nc.cliente_id))
        ), credito_cliente AS (
         SELECT c_1.id AS cliente_id,
            COALESCE(c_1.saldo_a_favor_ivr, 0::numeric) + COALESCE(n.total_nc, 0::numeric) AS credito
           FROM clientes c_1
             LEFT JOIN nc_totals n ON n.cliente_id = c_1.id
        ), fact_pend AS (
         SELECT f.cliente_id,
            f.saldo_pendiente,
            f.fecha_vencimiento,
            sum(f.saldo_pendiente) OVER (PARTITION BY f.cliente_id ORDER BY f.fecha_vencimiento, f.fecha_emision, f.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_saldo
           FROM facturas f
          WHERE f.tipo_factura = 'IVR'::text AND (f.estado = ANY (ARRAY['pendiente'::text, 'parcial'::text]))
        ), fact_neto AS (
         SELECT fp.cliente_id,
            fp.fecha_vencimiento,
            GREATEST(fp.saldo_pendiente - GREATEST(cc.credito - (fp.cum_saldo - fp.saldo_pendiente), 0::numeric), 0::numeric) AS saldo_efectivo
           FROM fact_pend fp
             JOIN credito_cliente cc ON cc.cliente_id = fp.cliente_id
        ), pend_totals AS (
         SELECT fn.cliente_id,
            sum(fn.saldo_efectivo) AS total_pendiente,
            count(*) FILTER (WHERE fn.saldo_efectivo > 0.005) AS cantidad_pendientes,
            sum(
                CASE
                    WHEN fn.fecha_vencimiento < CURRENT_DATE THEN fn.saldo_efectivo
                    ELSE 0::numeric
                END) AS total_vencido,
            count(*) FILTER (WHERE fn.fecha_vencimiento < CURRENT_DATE AND fn.saldo_efectivo > 0.005) AS cantidad_vencidas,
            sum(
                CASE
                    WHEN fn.fecha_vencimiento IS NULL OR fn.fecha_vencimiento >= CURRENT_DATE THEN fn.saldo_efectivo
                    ELSE 0::numeric
                END) AS total_no_vencido,
            count(*) FILTER (WHERE (fn.fecha_vencimiento IS NULL OR fn.fecha_vencimiento >= CURRENT_DATE) AND fn.saldo_efectivo > 0.005) AS cantidad_no_vencidas
           FROM fact_neto fn
          GROUP BY fn.cliente_id
        ), ivr_totals AS (
         SELECT f.cliente_id,
            sum(f.total) AS total_remitido,
            count(f.id) AS cantidad_ivr,
            sum(
                CASE
                    WHEN f.estado = 'pagada'::text THEN f.total
                    ELSE 0::numeric
                END) AS total_cobrado_full,
            count(
                CASE
                    WHEN f.estado = 'pagada'::text THEN 1
                    ELSE NULL::integer
                END) AS cantidad_cobrados,
            max(f.fecha_emision) AS ultima_emision
           FROM facturas f
          WHERE f.tipo_factura = 'IVR'::text AND f.estado <> 'anulada'::text
          GROUP BY f.cliente_id
        ), cobro_totals AS (
         SELECT co.cliente_id,
            sum(co.monto) AS total_cobrado,
            count(*) AS cantidad_cobros,
            max(co.fecha_pago) AS ultimo_cobro
           FROM cobros co
          WHERE co.cliente_id IS NOT NULL
          GROUP BY co.cliente_id
        )
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
    COALESCE(ivr_totals.total_remitido, 0::numeric) - COALESCE(cobro_totals.total_cobrado, 0::numeric) - COALESCE(nc_totals.total_nc, 0::numeric) AS saldo_actual,
    COALESCE(pend_totals.total_pendiente, 0::numeric) AS total_pendiente,
    COALESCE(pend_totals.cantidad_pendientes, 0::bigint) AS cantidad_pendientes,
    COALESCE(ivr_totals.total_cobrado_full, 0::numeric) AS total_cobrado_full,
    COALESCE(ivr_totals.cantidad_cobrados, 0::bigint) AS cantidad_cobrados,
    GREATEST(COALESCE(ivr_totals.ultima_emision, '1900-01-01'::date), COALESCE(cobro_totals.ultimo_cobro, '1900-01-01'::date)) AS ultima_actividad,
    COALESCE(c.saldo_a_favor_ivr, 0::numeric) AS saldo_a_favor_ivr,
    COALESCE(nc_totals.total_nc, 0::numeric) AS total_notas_credito,
    COALESCE(nc_totals.cantidad_nc, 0::bigint) AS cantidad_notas_credito,
    COALESCE(pend_totals.total_vencido, 0::numeric) AS total_vencido,
    COALESCE(pend_totals.cantidad_vencidas, 0::bigint) AS cantidad_vencidas,
    COALESCE(pend_totals.total_no_vencido, 0::numeric) AS total_no_vencido,
    COALESCE(pend_totals.cantidad_no_vencidas, 0::bigint) AS cantidad_no_vencidas
   FROM clientes c
     LEFT JOIN ivr_totals ON ivr_totals.cliente_id = c.id
     LEFT JOIN cobro_totals ON cobro_totals.cliente_id = c.id
     LEFT JOIN nc_totals ON nc_totals.cliente_id = c.id
     LEFT JOIN pend_totals ON pend_totals.cliente_id = c.id
  WHERE ivr_totals.cantidad_ivr > 0 OR c.saldo_a_favor_ivr > 0::numeric OR cobro_totals.cantidad_cobros > 0;
;
