-- Novedades curables: columnas para el widget "Equipos Recientes" (modelo híbrido)
-- novedad_fijada: pin manual (aparece siempre, arriba)
-- novedad_orden:  orden entre los fijados (ASC)
-- novedad_oculta: excluye al equipo de Novedades aunque sea reciente

ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS novedad_fijada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS novedad_orden  integer,
  ADD COLUMN IF NOT EXISTS novedad_oculta boolean NOT NULL DEFAULT false;

-- Índice para resolver rápido la lista de fijados
CREATE INDEX IF NOT EXISTS idx_equipos_novedad_fijada
  ON equipos (novedad_orden)
  WHERE novedad_fijada = true;
