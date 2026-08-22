-- Catálogos dedicados para el módulo de servicios técnicos.
--
-- Antes los campos `tecnico`, `estado_contable` y `tipo_servicio` eran TEXT
-- libre en la tabla `servicios` y la lista de opciones se calculaba con
-- SELECT DISTINCT. Eso funcionaba pero tenía 3 problemas:
--   1. No se podía dar de baja un técnico que dejó la empresa
--   2. Typos quedaban como valores distintos para siempre
--   3. No había forma de validar contra una lista controlada
--
-- Estas tablas resuelven los 3 problemas sin romper datos existentes:
-- los valores de servicios se siguen guardando como TEXT (compat total),
-- pero la fuente del dropdown ahora es una tabla controlada con `activo`.
--
-- IDEMPOTENTE: la migración soporta corrida múltiple y casos donde algunas
-- tablas ya existen (por intentos previos o por features paralelas).

-- ============================================================================
-- 1. Técnicos
-- ============================================================================
CREATE TABLE IF NOT EXISTS servicio_tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  color TEXT,
  orden INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT servicio_tecnicos_unique_per_org UNIQUE (org_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_servicio_tecnicos_org_activo
  ON servicio_tecnicos (org_id, activo);

-- ============================================================================
-- 2. Estados contables
-- ============================================================================
CREATE TABLE IF NOT EXISTS servicio_estados_contables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  color TEXT,
  orden INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT servicio_estados_contables_unique_per_org UNIQUE (org_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_servicio_estados_contables_org_activo
  ON servicio_estados_contables (org_id, activo);

-- ============================================================================
-- 3. Tipos de servicio
-- ============================================================================
-- La tabla servicio_tipos ya existía pero era global (sin org_id), aunque la
-- API /api/servicio-tipos ya espera org_id. Hacemos ALTER en lugar de DROP
-- para no perder los 8 registros existentes ni romper el esquema rico
-- (descripcion, color, codigo, requiere_presupuesto, etc.).

DO $$
BEGIN
  -- Crear tabla si nunca existió
  CREATE TABLE IF NOT EXISTS servicio_tipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    color TEXT,
    orden INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Si la columna org_id no existe, agregarla
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'servicio_tipos' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE servicio_tipos ADD COLUMN org_id UUID;

    -- Backfill: asignar todas las filas existentes a Uno Electromedicina
    -- (el único org que actualmente usa servicio técnico)
    UPDATE servicio_tipos
       SET org_id = (
         SELECT id FROM organizations
         WHERE slug = 'uno-electromedicina' OR nombre ILIKE '%uno electromedicina%'
         LIMIT 1
       )
     WHERE org_id IS NULL;

    -- Si algún row quedó sin org (ej: no hay Uno), eliminarlo en lugar de
    -- fallar el NOT NULL constraint
    DELETE FROM servicio_tipos WHERE org_id IS NULL;

    ALTER TABLE servicio_tipos ALTER COLUMN org_id SET NOT NULL;
    ALTER TABLE servicio_tipos
      ADD CONSTRAINT servicio_tipos_org_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Si existía un UNIQUE constraint global sobre (nombre), removerlo
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'servicio_tipos_nombre_key'
  ) THEN
    ALTER TABLE servicio_tipos DROP CONSTRAINT servicio_tipos_nombre_key;
  END IF;

  -- Agregar UNIQUE per-org
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'servicio_tipos_unique_per_org'
  ) THEN
    ALTER TABLE servicio_tipos
      ADD CONSTRAINT servicio_tipos_unique_per_org UNIQUE (org_id, nombre);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_servicio_tipos_org_activo
  ON servicio_tipos (org_id, activo);

-- ============================================================================
-- SEED: importar valores distintos existentes desde la tabla `servicios`
-- ============================================================================
-- Para cada (org_id, nombre) único en servicios.tecnico, crear una fila en
-- servicio_tecnicos. Idem para los otros dos. ON CONFLICT DO NOTHING para
-- que sea idempotente si la migración corre dos veces.

INSERT INTO servicio_tecnicos (org_id, nombre, activo)
SELECT DISTINCT s.org_id, TRIM(s.tecnico), true
FROM servicios s
WHERE s.tecnico IS NOT NULL
  AND TRIM(s.tecnico) <> ''
  AND s.org_id IS NOT NULL
ON CONFLICT (org_id, nombre) DO NOTHING;

INSERT INTO servicio_estados_contables (org_id, nombre, activo)
SELECT DISTINCT s.org_id, TRIM(s.estado_contable), true
FROM servicios s
WHERE s.estado_contable IS NOT NULL
  AND TRIM(s.estado_contable) <> ''
  AND s.org_id IS NOT NULL
ON CONFLICT (org_id, nombre) DO NOTHING;

INSERT INTO servicio_tipos (org_id, nombre, activo)
SELECT DISTINCT s.org_id, TRIM(s.tipo_servicio), true
FROM servicios s
WHERE s.tipo_servicio IS NOT NULL
  AND TRIM(s.tipo_servicio) <> ''
  AND s.org_id IS NOT NULL
ON CONFLICT (org_id, nombre) DO NOTHING;
