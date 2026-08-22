-- Track who originally created each oportunidad (separate from vendedor_id, which can be reassigned)
ALTER TABLE oportunidades_venta
  ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES personas(id);

CREATE INDEX IF NOT EXISTS idx_oportunidades_creado_por ON oportunidades_venta(creado_por);
