-- Equipos de catálogo: precio de costo + ganancia (%) -> precio de lista
-- El precio de lista se calcula en el form como costo * (1 + ganancia/100),
-- pero sigue siendo editable (al editarlo se recalcula la ganancia).
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS precio_costo numeric,
  ADD COLUMN IF NOT EXISTS ganancia    numeric;
