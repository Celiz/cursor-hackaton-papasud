-- 930: gastos_comerciales con vínculos + fix de mv_cliente_clv
--
-- (1) mv_cliente_clv de migración 859 está rota: usa `c.activo` que no
--     existe (clientes usa `estado`). La dropeamos y recreamos correctamente.
--
-- (2) Agregamos a gastos_comerciales FK opcional a ordenes_compra y
--     un flag es_espontaneo para distinguir carga manual vs vinculada.

-- ============================================================
-- Fix de mv_cliente_clv
-- ============================================================

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
GROUP BY c.id, c.org_id, c.nombre;

CREATE UNIQUE INDEX idx_mv_cliente_clv_id ON mv_cliente_clv(cliente_id);
CREATE INDEX idx_mv_cliente_clv_org ON mv_cliente_clv(org_id);

-- refresh_clv() ya existe desde 859, sigue válida

-- ============================================================
-- Vínculos en gastos_comerciales
-- ============================================================

ALTER TABLE gastos_comerciales
  ADD COLUMN IF NOT EXISTS orden_compra_id UUID
    REFERENCES ordenes_compra(id) ON DELETE SET NULL;

ALTER TABLE gastos_comerciales
  ADD COLUMN IF NOT EXISTS cc_proveedor_movimiento_id UUID NULL;

ALTER TABLE gastos_comerciales
  ADD COLUMN IF NOT EXISTS es_espontaneo BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_gastos_comerciales_oc
  ON gastos_comerciales(orden_compra_id)
  WHERE orden_compra_id IS NOT NULL;

-- Un gasto no puede estar vinculado a OC y a mov CC al mismo tiempo
ALTER TABLE gastos_comerciales
  DROP CONSTRAINT IF EXISTS chk_gastos_un_vinculo;

ALTER TABLE gastos_comerciales
  ADD CONSTRAINT chk_gastos_un_vinculo
  CHECK (NOT (orden_compra_id IS NOT NULL AND cc_proveedor_movimiento_id IS NOT NULL));

-- Una OC solo puede estar vinculada a un gasto comercial
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gastos_oc
  ON gastos_comerciales(orden_compra_id)
  WHERE orden_compra_id IS NOT NULL;
