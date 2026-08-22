-- Permite que cada item de un presupuesto multi-equipo lleve su propia ficha
-- técnica (override del catálogo). Necesario para que el modal de edición
-- pueda mostrar/editar specs por equipo en modo multi.
ALTER TABLE public.presupuestos_equipos_items
  ADD COLUMN IF NOT EXISTS especificaciones jsonb,
  ADD COLUMN IF NOT EXISTS especificaciones_personalizada boolean DEFAULT false NOT NULL;
