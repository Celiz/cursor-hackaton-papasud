-- Migration 969: especificaciones editables por presupuesto de equipo
--
-- Hasta hoy el presupuesto de equipo no tenía specs propias: el PDF leía
-- directo equipos.especificaciones (catálogo vivo). Estas columnas le dan a
-- cada presupuesto su copia editable.

ALTER TABLE public.presupuestos_equipos
  ADD COLUMN IF NOT EXISTS especificaciones jsonb,
  ADD COLUMN IF NOT EXISTS especificaciones_personalizada boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.presupuestos_equipos.especificaciones IS
  'Copia de las specs técnicas del equipo para este presupuesto. NULL = nunca se copió (usar catálogo).';
COMMENT ON COLUMN public.presupuestos_equipos.especificaciones_personalizada IS
  'TRUE si el operador editó las specs en este presupuesto. Si FALSE y el presupuesto está en borrador, se re-sincroniza con el catálogo al leer.';
