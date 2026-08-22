-- ============================================================================
-- Migration 936: personas_clientes (N:M persona ↔ cliente)
-- Una persona puede ser contacto de varios clientes (p.ej. vendedor que trabaja
-- con varias empresas) y un cliente puede tener varios contactos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS personas_clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  rol        TEXT,
  activo     BOOLEAN NOT NULL DEFAULT true,
  notas      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_personas_clientes UNIQUE (persona_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS idx_personas_clientes_persona  ON personas_clientes(persona_id);
CREATE INDEX IF NOT EXISTS idx_personas_clientes_cliente  ON personas_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_personas_clientes_activo   ON personas_clientes(persona_id) WHERE activo = true;

CREATE OR REPLACE FUNCTION personas_clientes_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personas_clientes_updated_at ON personas_clientes;
CREATE TRIGGER trg_personas_clientes_updated_at
  BEFORE UPDATE ON personas_clientes
  FOR EACH ROW EXECUTE FUNCTION personas_clientes_set_updated_at();
