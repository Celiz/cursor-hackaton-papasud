-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE producto_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  alias TEXT NOT NULL,           -- the informal/commercial name
  tipo TEXT DEFAULT 'manual',    -- 'manual', 'confirmed', 'auto'
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alias, org_id)
);

CREATE INDEX idx_producto_aliases_org ON producto_aliases(org_id);
CREATE INDEX idx_producto_aliases_trgm ON producto_aliases USING gin (alias gin_trgm_ops);
