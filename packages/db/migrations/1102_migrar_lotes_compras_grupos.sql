-- Migrar desde aeterna viejo (aeterna_src): data operativa de Uno que no se
-- pasó en el rebuild de aeterna2 (tablas vacías pese a que gesti las usa).
--   1) productos_lotes        — lotes/vencimientos
--   2) remitos_compra_items   — ítems de remitos de compra (las cabeceras ya están)
--   3) producto_grupo_items   — miembros de grupos de productos (los grupos ya están)
-- UUIDs preservados → match por producto_id/remito_compra_id/grupo_id. Idempotente.
-- Requiere dblink + aeterna_src restaurada.

-- ===== 1) productos_lotes (~7891) =====
INSERT INTO productos_lotes (id, producto_id, lote, vencimiento, stock, marca_id, created_at, fecha_vencimiento)
SELECT t.id, t.producto_id, t.lote, t.vencimiento, t.stock,
       CASE WHEN t.marca_id IN (SELECT id FROM marcas) THEN t.marca_id ELSE NULL END,
       t.created_at, t.fecha_vencimiento
FROM dblink('dbname=aeterna_src user=aeterna',
  'SELECT id, producto_id, lote, vencimiento, stock, marca_id, created_at, fecha_vencimiento FROM productos_lotes')
  AS t(id uuid, producto_id uuid, lote text, vencimiento date, stock numeric, marca_id uuid,
       created_at timestamptz, fecha_vencimiento date)
WHERE t.producto_id IN (SELECT id FROM productos)
ON CONFLICT DO NOTHING;

-- ===== 2) remitos_compra_items (~11958) =====
INSERT INTO remitos_compra_items
  (id, remito_compra_id, producto_id, cantidad, precio_unitario, marca, descripcion, rubro, lote, fecha_vencimiento, numero_serie, verificado)
SELECT t.id, t.remito_compra_id, t.producto_id, t.cantidad, t.precio_unitario, t.marca,
       t.descripcion, t.rubro, t.lote, t.fecha_vencimiento, t.numero_serie, t.verificado
FROM dblink('dbname=aeterna_src user=aeterna',
  'SELECT id, remito_compra_id, producto_id, cantidad, precio_unitario, marca, descripcion, rubro, lote, fecha_vencimiento, numero_serie, verificado FROM remitos_compra_items')
  AS t(id uuid, remito_compra_id uuid, producto_id uuid, cantidad numeric, precio_unitario numeric,
       marca text, descripcion text, rubro text, lote text, fecha_vencimiento date, numero_serie text, verificado boolean)
WHERE t.producto_id IN (SELECT id FROM productos)
  AND t.remito_compra_id IN (SELECT id FROM remitos_compra)
ON CONFLICT DO NOTHING;

-- ===== 3) producto_grupo_items (~5541) =====
INSERT INTO producto_grupo_items (grupo_id, producto_id, added_at)
SELECT t.grupo_id, t.producto_id, t.added_at
FROM dblink('dbname=aeterna_src user=aeterna',
  'SELECT grupo_id, producto_id, added_at FROM producto_grupo_items')
  AS t(grupo_id uuid, producto_id uuid, added_at timestamptz)
WHERE t.producto_id IN (SELECT id FROM productos)
  AND t.grupo_id IN (SELECT id FROM producto_grupos)
ON CONFLICT DO NOTHING;
