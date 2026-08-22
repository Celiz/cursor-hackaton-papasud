-- Migration 1117: costo por línea en presupuestos de equipos.
--
-- Cada equipo cotizado guarda su precio de COSTO (editable por presupuesto, sin
-- tocar el catálogo). Es la base para la ganancia % editable. Es un dato INTERNO:
-- el subtotal/total y el PDF del cliente siguen usando solo el precio de venta
-- (precio_unitario); el costo no aparece en el PDF.
ALTER TABLE public.presupuestos_equipos_items
  ADD COLUMN IF NOT EXISTS precio_costo numeric(12,2) DEFAULT 0;
COMMENT ON COLUMN public.presupuestos_equipos_items.precio_costo IS
  'Costo de la línea, en la moneda del presupuesto. Interno (base de la ganancia); no aparece en el PDF.';
