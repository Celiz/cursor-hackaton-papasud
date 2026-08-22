-- 1117_listas_proveedor_equipos.sql
-- Listas de proveedor para equipos: tipo de lista + vínculo de item a equipo.
-- NO se agregan columnas de costo a equipos: ya existen (precio_costo, ganancia,
-- moneda_compra, precio_venta_modo — migs 1111/1115).
-- Nota: el runner (migrate.ts) ya envuelve cada migración en una transacción; sin BEGIN/COMMIT acá.

-- Tipo de lista de proveedor (productos | equipos)
ALTER TABLE proveedor_listas_precios
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'productos';
ALTER TABLE proveedor_listas_precios
  DROP CONSTRAINT IF EXISTS chk_lista_tipo;
ALTER TABLE proveedor_listas_precios
  ADD CONSTRAINT chk_lista_tipo CHECK (tipo IN ('productos', 'equipos'));

-- Vínculo de item a equipo (una fila vincula a producto O equipo, nunca ambos)
ALTER TABLE proveedor_lista_items
  ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL;
ALTER TABLE proveedor_lista_items
  DROP CONSTRAINT IF EXISTS chk_item_vinculo_unico;
ALTER TABLE proveedor_lista_items
  ADD CONSTRAINT chk_item_vinculo_unico
  CHECK (producto_id IS NULL OR equipo_id IS NULL);
CREATE INDEX IF NOT EXISTS idx_prov_lista_items_equipo
  ON proveedor_lista_items(equipo_id);
