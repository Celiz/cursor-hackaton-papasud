-- Agrega oportunidad_id a instalaciones para trazabilidad del flujo
-- CRM → Instalación (automatización cuando una oportunidad se gana).
--
-- El manual de crear instalación sin oportunidad sigue funcionando
-- porque la columna es nullable.

ALTER TABLE instalaciones
  ADD COLUMN IF NOT EXISTS oportunidad_id UUID;

-- FK soft (ON DELETE SET NULL) para que si se elimina una oportunidad
-- la instalación no se borre — queda huérfana pero rastreable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instalaciones_oportunidad_fkey'
  ) THEN
    ALTER TABLE instalaciones
      ADD CONSTRAINT instalaciones_oportunidad_fkey
      FOREIGN KEY (oportunidad_id)
      REFERENCES oportunidades_venta(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_instalaciones_oportunidad
  ON instalaciones (oportunidad_id)
  WHERE oportunidad_id IS NOT NULL;
