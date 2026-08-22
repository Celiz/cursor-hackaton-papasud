-- Equipos: moneda de compra (costo) distinta de la de venta (precio_lista_moneda).
-- Caso: se compra en USD y se vende en ARS.
--   moneda_compra      -> moneda del precio_costo (default USD).
--   precio_venta_modo  -> 'calculado' (precio_lista = costo conv * (1+ganancia%), flota
--                          con el dolar del dia) | 'fijo' (precio_lista cargado a mano).
-- precio_lista_moneda sigue siendo la moneda de VENTA.
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS moneda_compra     text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS precio_venta_modo text DEFAULT 'calculado';

-- Backfill: equipos existentes mantienen compra = venta (sin cambio de comportamiento).
UPDATE equipos
   SET moneda_compra = COALESCE(precio_lista_moneda, 'USD')
 WHERE moneda_compra IS NULL OR moneda_compra = 'USD';
