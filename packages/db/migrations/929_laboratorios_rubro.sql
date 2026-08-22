-- Migration 929: Agregar rubro (humano/veterinario) a laboratorios
--
-- Un laboratorio puede ser de salud humana o veterinaria. Este campo es
-- ortogonal al `tipo` (hospital, clínica, laboratorio, etc.) porque cada
-- uno puede existir en ambos rubros.
--
-- Default 'humano' porque la mayoría de los laboratorios existentes son
-- para salud humana. Se puede cambiar manualmente por UI.

ALTER TABLE laboratorios
  ADD COLUMN IF NOT EXISTS rubro TEXT DEFAULT 'humano';

ALTER TABLE laboratorios
  DROP CONSTRAINT IF EXISTS laboratorios_rubro_chk;

ALTER TABLE laboratorios
  ADD CONSTRAINT laboratorios_rubro_chk
  CHECK (rubro IN ('humano', 'veterinario'));

CREATE INDEX IF NOT EXISTS idx_laboratorios_rubro ON laboratorios(rubro);
