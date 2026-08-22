-- Servicios: workflow "precio listo" → "comunicado al cliente"
-- Independiente del campo `estado` (que es texto libre y track el progreso técnico).
-- Este workflow track la comunicación comercial: cuando José pone precio final
-- y Gabriela le avisa al cliente.

ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS precio_listo_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS precio_listo_por   UUID REFERENCES personas(id),
  ADD COLUMN IF NOT EXISTS comunicado_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comunicado_por     UUID REFERENCES personas(id),
  ADD COLUMN IF NOT EXISTS comunicado_medio   TEXT,    -- whatsapp | email | telefono | presencial | otro
  ADD COLUMN IF NOT EXISTS contacto_telefono  TEXT,
  ADD COLUMN IF NOT EXISTS contacto_email     TEXT;

-- Índice parcial: cola de Gabriela (precio listo, aún no comunicado)
CREATE INDEX IF NOT EXISTS idx_servicios_cola_gabriela
  ON servicios(org_id, precio_listo_at)
  WHERE precio_listo_at IS NOT NULL AND comunicado_at IS NULL;
