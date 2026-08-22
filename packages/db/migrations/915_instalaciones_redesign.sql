-- 915_instalaciones_redesign.sql
-- Rediseño de instalaciones: items unificados con tracking de compra,
-- oportunidad obligatoria, fechas con estado, comentarios.

BEGIN;

-- ============================================================================
-- 1. Backfill: cada instalación sin oportunidad_id recibe una oportunidad
--    "directa" auto-generada para poder enforzar NOT NULL.
-- ============================================================================

WITH nuevas AS (
  INSERT INTO oportunidades_venta (id, org_id, cliente_id, nombre, etapa, monto_estimado, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    c.org_id,
    i.cliente_id,
    'Instalación directa – ' || TO_CHAR(i.created_at, 'DD/MM/YYYY'),
    'ganado',
    0,
    i.created_at,
    i.created_at
  FROM instalaciones i
  JOIN clientes c ON c.id = i.cliente_id
  WHERE i.oportunidad_id IS NULL
  RETURNING id, cliente_id, created_at
)
UPDATE instalaciones i
SET oportunidad_id = nuevas.id
FROM nuevas
WHERE i.oportunidad_id IS NULL
  AND nuevas.cliente_id = i.cliente_id
  AND nuevas.created_at = i.created_at;

-- ============================================================================
-- 2. instalaciones: oportunidad NOT NULL + fecha con estado
-- ============================================================================

ALTER TABLE instalaciones
  ALTER COLUMN oportunidad_id SET NOT NULL;

ALTER TABLE instalaciones
  ADD COLUMN IF NOT EXISTS fecha_estado text NOT NULL DEFAULT 'a_confirmar'
    CHECK (fecha_estado IN ('a_confirmar', 'aproximada', 'confirmada')),
  ADD COLUMN IF NOT EXISTS fecha_nota text;

-- ============================================================================
-- 3. instalaciones_items: soporte para unidades físicas + placeholders +
--    estado de compra
-- ============================================================================

ALTER TABLE instalaciones_items
  ADD COLUMN IF NOT EXISTS equipo_unidad_id uuid REFERENCES equipos_unidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS es_placeholder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS placeholder_descripcion text,
  ADD COLUMN IF NOT EXISTS estado_compra text NOT NULL DEFAULT 'en_stock'
    CHECK (estado_compra IN ('en_stock', 'por_pedir', 'pedido', 'en_camino', 'recibido')),
  ADD COLUMN IF NOT EXISTS fecha_pedido timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_estimada_llegada timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_recibido timestamptz;

CREATE INDEX IF NOT EXISTS idx_instalaciones_items_equipo_unidad
  ON instalaciones_items(equipo_unidad_id)
  WHERE equipo_unidad_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_instalaciones_items_placeholder
  ON instalaciones_items(instalacion_id)
  WHERE es_placeholder = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instalaciones_items_real_has_fk'
  ) THEN
    ALTER TABLE instalaciones_items
      ADD CONSTRAINT instalaciones_items_real_has_fk CHECK (
        es_placeholder = true
        OR (tipo_item IN ('equipo_principal', 'equipo_adicional') AND equipo_unidad_id IS NOT NULL)
        OR (tipo_item IN ('insumo', 'material', 'herramienta') AND producto_id IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instalaciones_items_placeholder_has_desc'
  ) THEN
    ALTER TABLE instalaciones_items
      ADD CONSTRAINT instalaciones_items_placeholder_has_desc CHECK (
        es_placeholder = false OR placeholder_descripcion IS NOT NULL
      );
  END IF;
END $$;

-- ============================================================================
-- 4. instalaciones_comentarios: hilo con menciones
-- ============================================================================

CREATE TABLE IF NOT EXISTS instalaciones_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id uuid NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES personas(id),
  texto text NOT NULL,
  menciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instalaciones_comentarios_instalacion
  ON instalaciones_comentarios(instalacion_id, created_at DESC);

COMMIT;
