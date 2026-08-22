-- Migration 926: Catálogo de items de proveedores

-- Enable trigram extension for fuzzy search (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Main catalog table
CREATE TABLE IF NOT EXISTS catalogo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  codigo_proveedor TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  imagenes TEXT[] DEFAULT '{}',
  url_referencia TEXT,
  unidad TEXT,
  activo BOOLEAN DEFAULT true,
  producto_id UUID REFERENCES productos(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique per org+proveedor+codigo (only when codigo is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalogo_items_org_prov_codigo
  ON catalogo_items(org_id, proveedor_id, codigo_proveedor)
  WHERE codigo_proveedor IS NOT NULL;

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_catalogo_items_org_proveedor
  ON catalogo_items(org_id, proveedor_id);

CREATE INDEX IF NOT EXISTS idx_catalogo_items_nombre_trgm
  ON catalogo_items USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_catalogo_items_producto
  ON catalogo_items(producto_id) WHERE producto_id IS NOT NULL;

-- Link catalog items to price list items
ALTER TABLE proveedor_lista_items
  ADD COLUMN IF NOT EXISTS catalogo_item_id UUID REFERENCES catalogo_items(id);

-- Link catalog items to presupuesto items
ALTER TABLE presupuestos_items
  ADD COLUMN IF NOT EXISTS catalogo_item_id UUID REFERENCES catalogo_items(id);

-- Allow OC items without producto (for catalog items not yet promoted)
ALTER TABLE ordenes_compra_items ALTER COLUMN producto_id DROP NOT NULL;

-- Add descripcion to OC items for catalog references
ALTER TABLE ordenes_compra_items ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- Markup default por proveedor (porcentaje, ej: 40 = 40%)
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS markup_default NUMERIC(5,2) DEFAULT 40;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_catalogo_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_catalogo_items_updated_at ON catalogo_items;
CREATE TRIGGER trg_catalogo_items_updated_at
  BEFORE UPDATE ON catalogo_items
  FOR EACH ROW EXECUTE FUNCTION update_catalogo_items_updated_at();
