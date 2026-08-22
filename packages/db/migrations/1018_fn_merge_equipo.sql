-- Función reutilizable para fusionar dos equipos del catálogo (deduplicación manual,
-- uno por uno). Repunta TODAS las tablas que referencian equipos(id) del equipo a
-- descartar (p_drop) al equipo canónico (p_keep) y luego borra p_drop.
--
-- Tablas con UNIQUE que involucra equipo_id (equipos_insumos, featured_equipos,
-- producto_equipo_compatibilidad): primero se borran del drop las filas que chocarían
-- con una ya existente en keep, y recién después se repunta el resto.
-- El resto de las tablas se repunta con UPDATE directo.
-- equipos_unidades NO tiene UNIQUE sobre equipo_id (solo sobre codigo), así que es directo;
-- sus hijos (alertas, movimientos, contratos...) cuelgan de unidades.id, que no cambia.
CREATE OR REPLACE FUNCTION merge_equipo(p_keep uuid, p_drop uuid)
RETURNS void AS $$
BEGIN
  IF p_keep = p_drop THEN
    RAISE EXCEPTION 'merge_equipo: keep y drop son el mismo id (%)', p_keep;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equipos WHERE id = p_keep) THEN
    RAISE EXCEPTION 'merge_equipo: el equipo keep % no existe', p_keep;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equipos WHERE id = p_drop) THEN
    RAISE EXCEPTION 'merge_equipo: el equipo drop % no existe', p_drop;
  END IF;

  -- equipos_insumos: UNIQUE (equipo_id, producto_id)
  DELETE FROM equipos_insumos d
   WHERE d.equipo_id = p_drop
     AND EXISTS (SELECT 1 FROM equipos_insumos k
                  WHERE k.equipo_id = p_keep AND k.producto_id = d.producto_id);
  UPDATE equipos_insumos SET equipo_id = p_keep WHERE equipo_id = p_drop;

  -- featured_equipos: UNIQUE (equipo_id, division)
  DELETE FROM featured_equipos d
   WHERE d.equipo_id = p_drop
     AND EXISTS (SELECT 1 FROM featured_equipos k
                  WHERE k.equipo_id = p_keep AND k.division IS NOT DISTINCT FROM d.division);
  UPDATE featured_equipos SET equipo_id = p_keep WHERE equipo_id = p_drop;

  -- producto_equipo_compatibilidad: UNIQUE (producto_id, equipo_id, marca_especifica)
  DELETE FROM producto_equipo_compatibilidad d
   WHERE d.equipo_id = p_drop
     AND EXISTS (SELECT 1 FROM producto_equipo_compatibilidad k
                  WHERE k.equipo_id = p_keep AND k.producto_id = d.producto_id
                    AND k.marca_especifica IS NOT DISTINCT FROM d.marca_especifica);
  UPDATE producto_equipo_compatibilidad SET equipo_id = p_keep WHERE equipo_id = p_drop;

  -- Tablas sin UNIQUE sobre equipo_id: repunte directo
  UPDATE equipos_unidades              SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE productos_equipos             SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE envios_items                  SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE instalaciones                 SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE instalaciones_items           SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE oportunidades_equipos_pedidos SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE oportunidades_items           SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE presupuestos_equipos          SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE presupuestos_equipos_items    SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE tareas                        SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE vet_analizadores              SET equipo_id = p_keep WHERE equipo_id = p_drop;
  UPDATE preparacion_entregas_items    SET equipo_catalogo_id = p_keep WHERE equipo_catalogo_id = p_drop;

  DELETE FROM equipos WHERE id = p_drop;
END;
$$ LANGUAGE plpgsql;
