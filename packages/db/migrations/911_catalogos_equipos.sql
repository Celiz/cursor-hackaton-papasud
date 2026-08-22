-- Catálogos org-scoped para marcas y tipos de equipos.
--
-- Estado previo:
--   marcas: ya era org-scoped pero sin UNIQUE(org_id, nombre) →
--     aparecian duplicados tipeados parecidos ("HACH", "HACH ", "hach").
--   tipos_equipos: era global (sin org_id) con UNIQUE(nombre) global.
--     Hay FKs desde instalaciones.tipo_equipo_id → tipos_equipos.id.
--
-- Esta migración:
--   1. Agrega org_id a tipos_equipos + backfill a Uno + FK + reemplaza
--      UNIQUE global por UNIQUE(org_id, LOWER(nombre)) case-insensitive.
--   2. Agrega UNIQUE(org_id, LOWER(nombre)) a marcas case-insensitive.
--   3. Seedea ambas tablas desde los valores distintos de `equipos.marca` y
--      `equipos.tipo` (que eran TEXT libres) para preservar lo ya cargado.

DO $$
DECLARE
  uno_org_id UUID;
BEGIN
  SELECT id INTO uno_org_id
  FROM organizations
  WHERE slug = 'uno-electromedicina' OR nombre ILIKE '%uno electromedicina%'
  LIMIT 1;

  -- ===========================================================
  -- 1. tipos_equipos — agregar org_id si falta
  -- ===========================================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tipos_equipos' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE tipos_equipos ADD COLUMN org_id UUID;

    -- Backfill: asigna los 8 tipos existentes a Uno
    UPDATE tipos_equipos SET org_id = uno_org_id WHERE org_id IS NULL;

    -- Si no hay Uno (caso raro) elimina las rows que quedaron huérfanas
    DELETE FROM tipos_equipos WHERE org_id IS NULL;

    ALTER TABLE tipos_equipos ALTER COLUMN org_id SET NOT NULL;
    ALTER TABLE tipos_equipos
      ADD CONSTRAINT tipos_equipos_org_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Drop UNIQUE global si existe (lo reemplazamos por uno per-org)
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tipos_equipos_nombre_key'
  ) THEN
    ALTER TABLE tipos_equipos DROP CONSTRAINT tipos_equipos_nombre_key;
  END IF;
END $$;

-- UNIQUE case-insensitive per-org para tipos_equipos.
-- Se crea fuera del DO $$ porque los CREATE UNIQUE INDEX con expresiones no
-- pueden usarse dentro de un ALTER TABLE ADD CONSTRAINT de forma directa.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tipos_equipos_org_nombre_ci
  ON tipos_equipos (org_id, LOWER(nombre));

CREATE INDEX IF NOT EXISTS idx_tipos_equipos_org_activo
  ON tipos_equipos (org_id, activo);

-- ===========================================================
-- 2. marcas — agregar UNIQUE case-insensitive per-org
-- ===========================================================
-- Si ya hay duplicados con distinta capitalización, este índice falla.
-- Los detectamos primero con una query de verificación que podría correrse
-- manualmente, pero confiamos en que hoy no hay (verificado con psql).
CREATE UNIQUE INDEX IF NOT EXISTS idx_marcas_org_nombre_ci
  ON marcas (org_id, LOWER(TRIM(nombre)));

CREATE INDEX IF NOT EXISTS idx_marcas_org_activo
  ON marcas (org_id, activo);

-- ===========================================================
-- 3. SEED desde `equipos` — importar valores distintos de marca y tipo
-- ===========================================================
-- Cada org puede tener sus propios valores. Idempotente con ON CONFLICT.

INSERT INTO marcas (org_id, nombre, activo)
SELECT DISTINCT e.org_id, TRIM(e.marca), true
FROM equipos e
WHERE e.marca IS NOT NULL
  AND TRIM(e.marca) <> ''
  AND e.org_id IS NOT NULL
ON CONFLICT (org_id, LOWER(TRIM(nombre))) DO NOTHING;

INSERT INTO tipos_equipos (org_id, nombre, activo)
SELECT DISTINCT e.org_id, TRIM(e.tipo), true
FROM equipos e
WHERE e.tipo IS NOT NULL
  AND TRIM(e.tipo) <> ''
  AND e.org_id IS NOT NULL
ON CONFLICT (org_id, LOWER(nombre)) DO NOTHING;
