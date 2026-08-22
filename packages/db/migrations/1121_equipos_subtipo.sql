-- 1121_equipos_subtipo.sql
-- Categoría (familia) + Tipo (subtipo en cascada).
-- La familia sigue en equipos.tipo (la usa servicio técnico). El subtipo va a
-- la columna nueva equipos.subtipo, alimentada por el catálogo subtipos_equipos
-- (org-scoped, editable) ligado a la categoría por nombre.

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS subtipo TEXT;

CREATE TABLE IF NOT EXISTS subtipos_equipos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  categoria   TEXT NOT NULL,            -- familia padre (= equipos.tipo / valor de tipos_equipos)
  nombre      TEXT NOT NULL,            -- el subtipo (ej. "Con carbones")
  descripcion TEXT,
  orden       INTEGER,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subtipos_equipos_org_cat_nombre
  ON subtipos_equipos (org_id, lower(categoria), lower(nombre));
CREATE INDEX IF NOT EXISTS idx_subtipos_equipos_org_cat
  ON subtipos_equipos (org_id, lower(categoria));

-- Seed para Uno Electromedicina. Los nombres de categoría matchean EXACTO los
-- valores reales en equipos.tipo (con acentos).
INSERT INTO subtipos_equipos (org_id, categoria, nombre, orden) VALUES
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Centrífuga', 'Con carbones', 1),
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Centrífuga', 'Magnética', 2),
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Centrífuga', 'De PRP', 3),
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Centrífuga', 'De alta velocidad', 4),
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Centrífuga', 'Refrigerada', 5),
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Centrífuga', 'De bolsa', 6),
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Contador Hematológico', '3 diferenciales', 1),
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Contador Hematológico', '5 diferenciales', 2),
  ('48b2a35a-0cb8-4643-a1d6-045918f9704c', 'Contador Hematológico', '5 diferenciales con samples', 3)
ON CONFLICT (org_id, lower(categoria), lower(nombre)) DO NOTHING;
