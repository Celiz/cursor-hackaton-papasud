-- Migration 1116: IVA por equipo (alícuota).
--
-- El equipo médico/lab nuevo tributa IVA reducido del 10,5%. Reutilizamos la
-- columna equipos.iva (numeric, hasta ahora sin uso: todas las filas en NULL)
-- como la alícuota de IVA por defecto del equipo. Se usa como IVA inicial al
-- armar un presupuesto y es editable por presupuesto.
ALTER TABLE public.equipos ALTER COLUMN iva SET DEFAULT 10.5;
UPDATE public.equipos SET iva = 10.5 WHERE iva IS NULL;
COMMENT ON COLUMN public.equipos.iva IS
  'Alícuota de IVA en % del equipo (default 10.5). IVA por defecto al presupuestar; editable por presupuesto.';

-- IVA por línea en presupuestos de equipos (modo multi-equipo): cada equipo
-- cotizado lleva su propia alícuota y el IVA total se suma por línea.
ALTER TABLE public.presupuestos_equipos_items
  ADD COLUMN IF NOT EXISTS iva_porcentaje numeric(5,2) DEFAULT 10.5;
COMMENT ON COLUMN public.presupuestos_equipos_items.iva_porcentaje IS
  'Alícuota de IVA en % aplicada a esta línea del presupuesto.';
