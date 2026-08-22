-- Completitud del score: % de factores con datos disponibles (0-100).
-- Permite distinguir un score real de uno "sin datos suficientes".
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS completitud integer;
