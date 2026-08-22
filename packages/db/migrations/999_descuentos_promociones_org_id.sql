-- descuentos_promociones nació en el baseline SIN org_id, pero toda la API
-- (/api/descuentos y /api/descuentos/calcular) filtra/inserta/actualiza por org_id.
-- Resultado: GET /api/descuentos devolvía 500 "column dp.org_id does not exist".
-- Agrega la columna multi-tenant. La tabla está vacía, no hace falta backfill.

ALTER TABLE descuentos_promociones
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_descuentos_promociones_org_id
  ON descuentos_promociones(org_id);
