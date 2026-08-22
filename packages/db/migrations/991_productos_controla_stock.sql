-- ============================================================================
-- 991: Toggle "controlar stock" por producto.
--
-- Hasta ahora el aviso de stock bajo se disparaba siempre que
-- stock_actual <= stock_minimo. Como muchos productos quedan creados con
-- stock_minimo = 0 (porque la org no quiere/no puede controlar stock de eso),
-- 0 <= 0 = true → todos esos productos alertaban sin sentido.
--
-- Agregamos un flag explícito por producto. Convive con la regla
-- stock_minimo > 0: para que un producto alerte tiene que CUMPLIR LAS DOS
-- (controla_stock=true y stock_minimo>0). Eso da control granular a la org.
-- ============================================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS controla_stock boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN productos.controla_stock IS
  'Si true, las alertas de stock bajo aplican (siempre que stock_minimo > 0). Si false, el producto se ignora en cualquier chequeo de stock.';

CREATE INDEX IF NOT EXISTS idx_productos_stock_alert
  ON productos (org_id)
  WHERE controla_stock = true AND stock_minimo > 0;
