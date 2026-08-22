-- 931: flag es_recurrente en productos para cálculo de MRR/ARR
--
-- Se usa en conjunto con features.ventas.tiene_recurrencia del OrgFeatures.
-- Cuando el flag de org está activo, MRR = SUM(items × precio) de productos
-- marcados es_recurrente=true facturados en el mes.

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_productos_recurrente
  ON productos(org_id)
  WHERE es_recurrente = true;
