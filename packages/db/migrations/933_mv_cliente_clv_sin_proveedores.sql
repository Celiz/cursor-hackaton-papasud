-- 933: mv_cliente_clv debe contener solo clientes, no proveedores.
--
-- El MV de 930 agrupa por cliente pero incluye registros de `clientes` con
-- tipo_entidad='proveedor'. Eso infla los KPIs (CLV promedio, top clientes,
-- retención, etc). Filtramos en la definición del MV.

DROP MATERIALIZED VIEW IF EXISTS mv_cliente_clv;

CREATE MATERIALIZED VIEW mv_cliente_clv AS
SELECT
  c.id AS cliente_id,
  c.org_id,
  c.nombre AS cliente_nombre,
  COUNT(f.id)::int AS total_facturas,
  COALESCE(SUM(f.total), 0) AS facturacion_total,
  MIN(f.fecha_emision) AS primera_compra,
  MAX(f.fecha_emision) AS ultima_compra,
  CASE
    WHEN COUNT(f.id) > 0
    THEN (COALESCE(MAX(f.fecha_emision), CURRENT_DATE) - COALESCE(MIN(f.fecha_emision), CURRENT_DATE))::int
    ELSE 0
  END AS dias_como_cliente,
  CASE
    WHEN COUNT(f.id) > 0 AND MIN(f.fecha_emision) != MAX(f.fecha_emision)
    THEN COALESCE(SUM(f.total), 0) / GREATEST(
      EXTRACT(EPOCH FROM AGE(MAX(f.fecha_emision), MIN(f.fecha_emision))) / (30.0 * 86400),
      1
    )::numeric
    ELSE COALESCE(SUM(f.total), 0)
  END AS ingreso_mensual_promedio,
  CASE
    WHEN COUNT(f.id) >= 2
    THEN (MAX(f.fecha_emision) - MIN(f.fecha_emision))::numeric / GREATEST(COUNT(f.id) - 1, 1)
    ELSE NULL
  END AS dias_entre_compras
FROM clientes c
LEFT JOIN facturas f
  ON f.cliente_id = c.id
 AND f.org_id = c.org_id
 AND COALESCE(f.estado, '') != 'anulada'
WHERE COALESCE(c.tipo_entidad, 'cliente') <> 'proveedor'
GROUP BY c.id, c.org_id, c.nombre;

CREATE UNIQUE INDEX idx_mv_cliente_clv_id ON mv_cliente_clv(cliente_id);
CREATE INDEX idx_mv_cliente_clv_org ON mv_cliente_clv(org_id);
