-- Migrar desde el aeterna viejo (DB aeterna_src, dump aeterna_work restaurado):
--   1) equipos_insumos        — qué insumos para qué equipo
--   2) cliente_insumos_preferidos — favoritos/preferidos del cliente
-- No se habían migrado en el rebuild de aeterna2 (quedaron en 0) pese a que
-- gesti las usa (whatsapp product-search, alertas de reposición, etc.).
-- UUIDs preservados → match directo por equipo_id/producto_id/cliente_id.
-- Idempotente (ON CONFLICT DO NOTHING). Requiere dblink + aeterna_src restaurada.

-- ===== 1) equipos_insumos (33054 esperados) =====
INSERT INTO equipos_insumos
  (id, equipo_id, producto_id, es_compatible, es_recomendado, consumo_aproximado, unidad_consumo, notas, created_at)
SELECT t.id, t.equipo_id, t.producto_id, t.es_compatible, t.es_recomendado,
       t.consumo_aproximado, t.unidad_consumo, t.notas, t.created_at
FROM dblink('dbname=aeterna_src user=aeterna',
  'SELECT id, equipo_id, producto_id, es_compatible, es_recomendado, consumo_aproximado, unidad_consumo, notas, created_at FROM equipos_insumos')
  AS t(id uuid, equipo_id uuid, producto_id uuid, es_compatible boolean, es_recomendado boolean,
       consumo_aproximado numeric, unidad_consumo text, notas text, created_at timestamptz)
WHERE t.equipo_id IN (SELECT id FROM equipos)
  AND t.producto_id IN (SELECT id FROM productos)
ON CONFLICT DO NOTHING;

-- ===== 2) cliente_insumos_preferidos (~32821 esperados) =====
-- created_by / reposicion_contactado_por → NULL (FK a users, vacía en aeterna2).
-- equipo_unidad_id → NULL si no existe en aeterna2 (en la práctica ya son todos NULL).
INSERT INTO cliente_insumos_preferidos
  (id, cliente_id, equipo_unidad_id, producto_id, es_favorito, es_recomendado_tecnico,
   orden_prioridad, marca_preferida, marcas_alternativas, marca_no_usar, cantidad_habitual,
   frecuencia_dias, ultima_compra, total_compras, alertar_stock_bajo, stock_minimo_alertar,
   notas, notas_internas, activo, created_at, updated_at, created_by, reposicion_snooze_hasta,
   reposicion_contactado_at, reposicion_contactado_por, reposicion_notas)
SELECT t.id, t.cliente_id,
       CASE WHEN t.equipo_unidad_id IN (SELECT id FROM equipos_unidades) THEN t.equipo_unidad_id ELSE NULL END,
       t.producto_id, t.es_favorito, t.es_recomendado_tecnico, t.orden_prioridad, t.marca_preferida,
       t.marcas_alternativas, t.marca_no_usar, t.cantidad_habitual, t.frecuencia_dias, t.ultima_compra,
       t.total_compras, t.alertar_stock_bajo, t.stock_minimo_alertar, t.notas, t.notas_internas,
       t.activo, t.created_at, t.updated_at, NULL::uuid, t.reposicion_snooze_hasta,
       t.reposicion_contactado_at, NULL::uuid, t.reposicion_notas
FROM dblink('dbname=aeterna_src user=aeterna',
  'SELECT id, cliente_id, equipo_unidad_id, producto_id, es_favorito, es_recomendado_tecnico, orden_prioridad, marca_preferida, marcas_alternativas, marca_no_usar, cantidad_habitual, frecuencia_dias, ultima_compra, total_compras, alertar_stock_bajo, stock_minimo_alertar, notas, notas_internas, activo, created_at, updated_at, reposicion_snooze_hasta, reposicion_contactado_at, reposicion_notas FROM cliente_insumos_preferidos')
  AS t(id uuid, cliente_id uuid, equipo_unidad_id uuid, producto_id uuid, es_favorito boolean,
       es_recomendado_tecnico boolean, orden_prioridad integer, marca_preferida varchar,
       marcas_alternativas jsonb, marca_no_usar text[], cantidad_habitual numeric, frecuencia_dias integer,
       ultima_compra date, total_compras integer, alertar_stock_bajo boolean, stock_minimo_alertar integer,
       notas text, notas_internas text, activo boolean, created_at timestamptz, updated_at timestamptz,
       reposicion_snooze_hasta date, reposicion_contactado_at timestamptz, reposicion_notas text)
WHERE t.cliente_id IN (SELECT id FROM clientes)
  AND t.producto_id IN (SELECT id FROM productos)
ON CONFLICT DO NOTHING;
