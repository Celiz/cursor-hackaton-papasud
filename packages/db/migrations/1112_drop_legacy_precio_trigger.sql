-- Elimina el trigger legacy duplicado de historial de precios.
--
-- `trigger_registrar_cambio_precio` (función registrar_cambio_precio) corría en
-- paralelo con `trg_productos_precio_change` (log_precio_change) sobre productos,
-- de modo que CADA cambio de precio insertaba DOS filas en historial_precios:
--   1) la de log_precio_change, con org_id/corrida_id/usuario_id correctos
--   2) la de registrar_cambio_precio, con org_id=NULL y sin corrida_id (huérfana)
--
-- log_precio_change ya cubre por completo lo que hacía el trigger legacy
-- (costo y venta, caso manual incluido) y además estampa org_id y la corrida.
-- Dejamos solo log_precio_change como única fuente del historial de precios.

DROP TRIGGER IF EXISTS trigger_registrar_cambio_precio ON public.productos;
DROP FUNCTION IF EXISTS public.registrar_cambio_precio();
