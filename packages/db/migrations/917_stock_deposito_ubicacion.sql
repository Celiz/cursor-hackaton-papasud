-- 917_stock_deposito_ubicacion.sql
-- Agrega depósito + ubicación física a equipos_unidades y productos.
-- Reemplaza el workflow en planilla para la ubicación de stock por depósito.

BEGIN;

-- ============================================================================
-- 1. equipos_unidades: depósito + ubicación física + metadatos XLSX
-- ============================================================================

ALTER TABLE equipos_unidades
  ADD COLUMN IF NOT EXISTS deposito_id uuid REFERENCES depositos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ubicacion_deposito text,
  ADD COLUMN IF NOT EXISTS fecha_ingreso date,
  ADD COLUMN IF NOT EXISTS fecha_ultimo_control date,
  ADD COLUMN IF NOT EXISTS condicion text CHECK (condicion IN ('nuevo', 'usado', 'reparacion', 'baja')),
  ADD COLUMN IF NOT EXISTS notas_deposito text;

CREATE INDEX IF NOT EXISTS idx_equipos_unidades_deposito
  ON equipos_unidades(deposito_id)
  WHERE deposito_id IS NOT NULL;

-- Backfill parte 1: migrar la relación polimórfica ubicacion_tipo='deposito' /
-- ubicacion_id al nuevo FK dedicado deposito_id.
UPDATE equipos_unidades
SET deposito_id = ubicacion_id
WHERE ubicacion_tipo = 'deposito'
  AND ubicacion_id IS NOT NULL
  AND deposito_id IS NULL;

-- Backfill parte 2: los equipos_unidades en stock sin depósito asignado van al
-- depósito principal de su org (si existe uno marcado como principal).
UPDATE equipos_unidades eu
SET deposito_id = d.id
FROM depositos d
WHERE eu.org_id = d.org_id
  AND d.es_principal = true
  AND eu.deposito_id IS NULL
  AND (eu.estado_general = 'stock' OR eu.cliente_id IS NULL);

-- ============================================================================
-- 2. productos: depósito principal
-- ============================================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS deposito_id uuid REFERENCES depositos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_productos_deposito
  ON productos(deposito_id)
  WHERE deposito_id IS NOT NULL;

-- Backfill: productos sin ubicación → depósito por defecto
UPDATE productos p
SET deposito_id = d.id
FROM depositos d
WHERE d.es_principal
  AND p.org_id = d.org_id
  AND p.deposito_id IS NULL;

COMMIT;
