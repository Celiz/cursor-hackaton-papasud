-- 992_unify_equipos_catalogo_expand.sql
-- Fase 1 de la unificación equipos + equipos_catalogo (Expand-Migrate-Contract).
-- Spec: docs/superpowers/specs/2026-05-26-equipos-unificacion-catalogo-design.md
-- Plan: docs/superpowers/plans/2026-05-26-equipos-unificacion-catalogo-plan.md
--
-- IMPORTANT: pg-aeterna es multi-tenant (21 orgs). El catálogo (equipos_catalogo) es de
-- Uno Electromedicina (org_id = 48b2a35a-0cb8-4643-a1d6-045918f9704c). Toda la lógica
-- de merge se restringe a equipos de esa org.
--
-- Cambios:
--   1. Agrega 7 columnas a equipos.
--   2. Mergea duplicados marca+modelo DENTRO de org Uno Electromedicina.
--   3. Inserta huérfanos del catálogo como nuevos equipos bajo org Uno.
--   4. Repunta FKs de featured_equipos y vet_analizadores.
--   5. Renombra equipos_catalogo a _legacy_backup y crea VIEW de compatibilidad.

BEGIN;

-- ============================================================
-- 0. Verificar precondición: org Uno Electromedicina existe
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = '48b2a35a-0cb8-4643-a1d6-045918f9704c') THEN
    RAISE EXCEPTION 'Org Uno Electromedicina (48b2a35a-0cb8-4643-a1d6-045918f9704c) no existe. Abortando.';
  END IF;
END $$;

-- NOTA: Esta migracion NO es idempotente en rerun completo.
-- Si se completa con exito, equipos_catalogo se renombra a equipos_catalogo_legacy_backup.
-- Un rerun fallara en Section 7 con relation equipos_catalogo does not exist.
-- El runner (packages/db/src/migrate.ts) trackea aplicadas en _migrations, evitando reruns automaticos.
-- Para reintentar manualmente, primero restaurar el dump pre-migracion.

-- ============================================================
-- 1. ALTER TABLE: agregar columnas web a equipos
-- ============================================================
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS mostrar_en_web    BOOLEAN     DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS orden_web         INTEGER     DEFAULT 0     NOT NULL,
  ADD COLUMN IF NOT EXISTS utilidad          TEXT,
  ADD COLUMN IF NOT EXISTS lis_parser_tipo   TEXT,
  ADD COLUMN IF NOT EXISTS precio_dolar      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS precio_pesos      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS iva               NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_equipos_mostrar_en_web
  ON equipos(mostrar_en_web) WHERE mostrar_en_web = true;
CREATE INDEX IF NOT EXISTS idx_equipos_orden_web
  ON equipos(orden_web)      WHERE mostrar_en_web = true;

-- ============================================================
-- 2. Tabla de mapeo: catalogo_id -> equipo_id (matches por marca+modelo dentro de org Uno)
-- ============================================================
CREATE TABLE IF NOT EXISTS _migration_catalog_to_equipo (
  catalogo_id     UUID PRIMARY KEY,
  catalogo_marca  TEXT,
  catalogo_modelo TEXT,
  equipo_id       UUID
);

TRUNCATE _migration_catalog_to_equipo;

INSERT INTO _migration_catalog_to_equipo (catalogo_id, catalogo_marca, catalogo_modelo, equipo_id)
SELECT
  ec.id,
  ec.marca,
  ec.modelo,
  COALESCE(
    -- Primero: match por marca+modelo dentro de org Uno
    (
      SELECT e.id FROM equipos e
      WHERE e.org_id = '48b2a35a-0cb8-4643-a1d6-045918f9704c'::uuid
        AND LOWER(TRIM(e.marca))  = LOWER(TRIM(ec.marca))
        AND LOWER(TRIM(e.modelo)) = LOWER(TRIM(ec.modelo))
      ORDER BY e.created_at ASC NULLS LAST
      LIMIT 1
    ),
    -- Fallback: match por UUID directo (misma fila, modelo difiere por normalización)
    (
      SELECT e.id FROM equipos e
      WHERE e.id = ec.id
        AND e.org_id = '48b2a35a-0cb8-4643-a1d6-045918f9704c'::uuid
      LIMIT 1
    )
  )
FROM equipos_catalogo ec;

-- ============================================================
-- 3. Merge: actualizar equipos de Uno que matchean con catalog
-- ============================================================
UPDATE equipos e
SET
  -- Campos web: catálogo gana cuando tiene valor
  imagen_url            = COALESCE(ec.imagen_url, e.imagen_url),
  descripcion_comercial = COALESCE(ec.detalle,    e.descripcion_comercial),
  utilidad              = COALESCE(ec.utilidad,        e.utilidad),
  mostrar_en_web        = ec.disponible,
  orden_web             = COALESCE(ec.orden, 0),
  lis_parser_tipo       = COALESCE(ec.lis_parser_tipo, e.lis_parser_tipo),
  precio_dolar          = COALESCE(ec.precio_dolar,    e.precio_dolar),
  precio_pesos          = COALESCE(ec.precio_pesos,    e.precio_pesos),
  iva                   = COALESCE(ec.iva,             e.iva),
  -- División: union sin duplicados
  division              = ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(e.division, '{}'::text[]) ||
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(ec.division, '[]'::jsonb)))
    )
  ),
  -- Especificaciones: catálogo sobreescribe keys que coincidan
  especificaciones      = COALESCE(e.especificaciones, '{}'::jsonb) || COALESCE(ec.especificaciones, '{}'::jsonb),
  -- Campos operacionales: equipos gana cuando tiene valor
  precio_lista          = COALESCE(e.precio_lista, ec.precio),
  precio_lista_moneda   = COALESCE(e.precio_lista_moneda, ec.moneda),
  tipo                  = COALESCE(e.tipo, ec.tipo),
  categoria             = COALESCE(e.categoria, ec.categoria)
FROM _migration_catalog_to_equipo m
JOIN equipos_catalogo ec ON ec.id = m.catalogo_id
WHERE e.id = m.equipo_id AND m.equipo_id IS NOT NULL;

-- ============================================================
-- 4. Insertar huérfanos: registros de catalog sin match en equipos de Uno
--    Se asignan al org_id de Uno Electromedicina.
-- ============================================================
INSERT INTO equipos (
  id, marca, modelo, tipo, categoria, utilidad,
  division, imagen_url, descripcion_comercial, especificaciones,
  mostrar_en_web, orden_web, precio_lista, precio_lista_moneda,
  precio_dolar, precio_pesos, iva, lis_parser_tipo,
  estado, condicion, disponible, org_id, created_at
)
SELECT
  ec.id,                    -- mantener UUID original para FKs
  ec.marca, ec.modelo, ec.tipo, ec.categoria, ec.utilidad,
  ARRAY(SELECT jsonb_array_elements_text(COALESCE(ec.division, '[]'::jsonb))),
  ec.imagen_url, ec.detalle, COALESCE(ec.especificaciones, '{}'::jsonb),
  ec.disponible, COALESCE(ec.orden, 0), ec.precio, ec.moneda,
  ec.precio_dolar, ec.precio_pesos, ec.iva, ec.lis_parser_tipo,
  'activo', 'nuevo', false,
  '48b2a35a-0cb8-4643-a1d6-045918f9704c'::uuid,  -- Uno Electromedicina
  ec.created_at
FROM equipos_catalogo ec
JOIN _migration_catalog_to_equipo m ON m.catalogo_id = ec.id
WHERE m.equipo_id IS NULL;

-- Después del insert, mapear huérfanos a sí mismos (para repunte de FKs)
UPDATE _migration_catalog_to_equipo
SET equipo_id = catalogo_id
WHERE equipo_id IS NULL;

-- ============================================================
-- 5. Repunte de FKs: featured_equipos
-- ============================================================
UPDATE featured_equipos f
SET equipo_id = m.equipo_id
FROM _migration_catalog_to_equipo m
WHERE f.equipo_id = m.catalogo_id
  AND m.catalogo_id <> m.equipo_id;

ALTER TABLE featured_equipos DROP CONSTRAINT featured_equipos_equipo_id_fkey;
ALTER TABLE featured_equipos
  ADD CONSTRAINT featured_equipos_equipo_id_fkey
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE;

-- ============================================================
-- 6. Repunte de FKs: vet_analizadores (con rename de columna)
-- ============================================================
UPDATE vet_analizadores v
SET equipo_catalogo_id = m.equipo_id
FROM _migration_catalog_to_equipo m
WHERE v.equipo_catalogo_id = m.catalogo_id
  AND m.catalogo_id <> m.equipo_id;

ALTER TABLE vet_analizadores DROP CONSTRAINT vet_analizadores_equipo_catalogo_id_fkey;
ALTER TABLE vet_analizadores
  ADD CONSTRAINT vet_analizadores_equipo_catalogo_id_fkey
  FOREIGN KEY (equipo_catalogo_id) REFERENCES equipos(id) ON DELETE SET NULL;

ALTER TABLE vet_analizadores RENAME COLUMN equipo_catalogo_id TO equipo_id;

-- ============================================================
-- 7. Rename tabla original + crear VIEW de compatibilidad
-- ============================================================
ALTER TABLE equipos_catalogo RENAME TO equipos_catalogo_legacy_backup;

CREATE VIEW equipos_catalogo AS
SELECT
  e.id,
  e.created_at,
  e.created_at AS updated_at,
  e.marca,
  e.modelo,
  e.tipo,
  e.categoria,
  e.utilidad,
  to_jsonb(COALESCE(e.division, '{}'::text[])) AS division,
  e.imagen_url,
  e.descripcion_comercial AS detalle,
  e.especificaciones,
  e.mostrar_en_web AS disponible,
  e.orden_web AS orden,
  e.precio_lista AS precio,
  e.precio_dolar,
  e.precio_pesos,
  e.precio_lista_moneda AS moneda,
  e.iva,
  NULL::uuid AS producto_id,
  e.lis_parser_tipo
FROM equipos e
WHERE e.mostrar_en_web = true
  AND e.org_id = '48b2a35a-0cb8-4643-a1d6-045918f9704c'::uuid;  -- Solo Uno

-- ============================================================
-- 8. Verificación final dentro de la transacción
-- ============================================================
DO $$
DECLARE
  v_mapping_count    INT;
  v_orphan_count     INT;
  v_featured_orphans INT;
  v_vet_orphans      INT;
BEGIN
  SELECT COUNT(*) INTO v_mapping_count FROM _migration_catalog_to_equipo;
  IF v_mapping_count = 0 THEN
    RAISE EXCEPTION 'Mapping vacío. Algo falló.';
  END IF;

  SELECT COUNT(*) INTO v_orphan_count FROM _migration_catalog_to_equipo WHERE equipo_id IS NULL;
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'Quedan % mappings sin equipo_id. Huérfanos no insertados.', v_orphan_count;
  END IF;

  SELECT COUNT(*) INTO v_featured_orphans
  FROM featured_equipos f
  WHERE NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id = f.equipo_id);
  IF v_featured_orphans > 0 THEN
    RAISE EXCEPTION 'featured_equipos tiene % filas huérfanas tras repunte.', v_featured_orphans;
  END IF;

  SELECT COUNT(*) INTO v_vet_orphans
  FROM vet_analizadores v
  WHERE v.equipo_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id = v.equipo_id);
  IF v_vet_orphans > 0 THEN
    RAISE EXCEPTION 'vet_analizadores tiene % filas huérfanas tras repunte.', v_vet_orphans;
  END IF;

  RAISE NOTICE 'Migración 992 OK: % mappings, FKs íntegras.', v_mapping_count;
END $$;

COMMIT;
