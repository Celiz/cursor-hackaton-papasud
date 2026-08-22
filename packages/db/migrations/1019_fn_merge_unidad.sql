-- Fusiona dos UNIDADES físicas (equipos_unidades) que son la misma máquina (mismo N/S
-- duplicado por el re-import). Repunta todos los hijos de la unidad a descartar (p_drop)
-- hacia la unidad a conservar (p_keep), preserva el código si keep no tiene, y borra p_drop.
-- Ninguna de estas tablas hijas tiene UNIQUE sobre el FK de unidad → UPDATE directo.
CREATE OR REPLACE FUNCTION merge_unidad(p_keep uuid, p_drop uuid)
RETURNS void AS $$
DECLARE
  v_codigo_drop text;
  v_codigo_keep text;
BEGIN
  IF p_keep = p_drop THEN
    RAISE EXCEPTION 'merge_unidad: keep y drop son el mismo id (%)', p_keep;
  END IF;

  -- Repunte de hijos
  UPDATE servicios                     SET equipo_id      = p_keep WHERE equipo_id      = p_drop;
  UPDATE equipos_movimientos           SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE equipos_contratos             SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE equipos_alertas               SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE equipos_danos                 SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE mantenimientos                SET equipo_id      = p_keep WHERE equipo_id      = p_drop;
  UPDATE mantenimiento_alertas         SET equipo_id      = p_keep WHERE equipo_id      = p_drop;
  UPDATE equipos_planes_mantenimiento  SET equipo_id      = p_keep WHERE equipo_id      = p_drop;
  UPDATE instalaciones_items           SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE oportunidades_items           SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE oportunidades_equipos_pedidos SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE productos_seriales            SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE preparacion_entregas_items    SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE cliente_insumos_preferidos    SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;
  UPDATE vet_analizadores              SET equipo_unidad_id = p_keep WHERE equipo_unidad_id = p_drop;

  -- Preservar el código (la unidad conservada suele venir sin código; la fantasma tiene EQU-xxx)
  SELECT codigo INTO v_codigo_drop FROM equipos_unidades WHERE id = p_drop;
  SELECT codigo INTO v_codigo_keep FROM equipos_unidades WHERE id = p_keep;

  DELETE FROM equipos_unidades WHERE id = p_drop;

  IF coalesce(btrim(v_codigo_keep),'') = '' AND coalesce(btrim(v_codigo_drop),'') <> '' THEN
    UPDATE equipos_unidades SET codigo = v_codigo_drop WHERE id = p_keep;
  END IF;
END;
$$ LANGUAGE plpgsql;
