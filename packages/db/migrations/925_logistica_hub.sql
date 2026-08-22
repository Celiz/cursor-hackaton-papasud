-- 925_logistica_hub.sql
-- Add estado workflow to remitos_compra + transportes table

-- 1. Add estado to remitos_compra for reception workflow
ALTER TABLE remitos_compra
  ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS controlado_por UUID REFERENCES personas(id),
  ADD COLUMN IF NOT EXISTS controlado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES personas(id),
  ADD COLUMN IF NOT EXISTS aprobado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ingresado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notas_control TEXT;

-- Set existing remitos as already ingresados (backwards compat)
UPDATE remitos_compra SET estado = 'ingresado' WHERE estado = 'pendiente' OR estado IS NULL;

-- Add lote and vencimiento to remitos_compra_items for control verification
ALTER TABLE remitos_compra_items
  ADD COLUMN IF NOT EXISTS lote TEXT,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS numero_serie TEXT,
  ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT false;

-- 2. Transportes table
CREATE TABLE IF NOT EXISTS transportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  nombre TEXT NOT NULL,
  telefono TEXT,
  whatsapp TEXT,
  email TEXT,
  zona_cobertura TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transportes_org ON transportes(org_id);

-- Add transporte_id to preparacion_entregas for dispatch
ALTER TABLE preparacion_entregas
  ADD COLUMN IF NOT EXISTS transporte_id UUID REFERENCES transportes(id),
  ADD COLUMN IF NOT EXISTS transporte_nombre TEXT;
