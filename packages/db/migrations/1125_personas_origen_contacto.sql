-- 1125_personas_origen_contacto.sql
-- Marca de qué fila de `contactos` provino una persona migrada (unificación
-- Contactos→Personas). Permite re-correr la migración sin duplicar.
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS origen_contacto_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_origen_contacto
  ON personas (origen_contacto_id)
  WHERE origen_contacto_id IS NOT NULL;
