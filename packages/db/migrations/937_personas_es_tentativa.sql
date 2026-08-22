-- Flag para distinguir personas auto-creadas (ej: desde un contacto de oportunidad)
-- de personas realmente enriquecidas. Facilita limpieza futura y filtros en UI.

ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS es_tentativa BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN personas.es_tentativa IS
  'true = persona creada automáticamente desde un contacto (oportunidad) y aún sin enriquecer.
   Las tentativas deben poder listarse/barrerse si la oportunidad se descarta.';

CREATE INDEX IF NOT EXISTS idx_personas_tentativa
  ON personas(org_id) WHERE es_tentativa = true;
