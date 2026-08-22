-- 1118_proveedor_listas_precios_org_id.sql
-- En aeterna2 la tabla proveedor_listas_precios se creó SIN org_id, pero el código compartido
-- filtra e inserta por plp.org_id (GET/POST/importar/aplicar). Sin la columna, el importador
-- de listas de proveedor falla ("column org_id ... does not exist") y el listado vuelve vacío.
-- Single-org; agregamos la columna para alinear con el código. El INSERT del importador provee
-- el org_id de la sesión. Nullable (el clonar no lo setea; no se usa hoy).
ALTER TABLE proveedor_listas_precios
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_prov_listas_precios_org
  ON proveedor_listas_precios(org_id);
