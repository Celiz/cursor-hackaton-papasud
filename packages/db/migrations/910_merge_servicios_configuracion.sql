-- Merge de servicios_configuracion (global legacy) en los catalogos org-scoped
-- creados en 908_servicio_catalogos.
--
-- Motivo: hay dos sistemas paralelos para listar tecnicos/tipos/estados del
-- servicio tecnico:
--   1. servicios_configuracion (tabla vieja, global, con columna `tipo`
--      polymorfica)
--   2. servicio_tecnicos / servicio_tipos / servicio_estados_contables
--      (tablas nuevas, por org, creadas en 908)
--
-- El wizard de "Nueva Orden de Servicio" leia del viejo, y el detail sheet
-- del nuevo. Por eso aparecian listas distintas.
--
-- Esta migracion importa todos los valores del viejo sistema al nuevo,
-- asociandolos a Uno Electromedicina (la unica org con servicio tecnico
-- activo). El endpoint viejo /api/servicios-configuracion queda funcional
-- para los tipos que no tienen catalogo nuevo (ej. modo_contacto).

DO $$
DECLARE
  uno_org_id UUID;
BEGIN
  SELECT id INTO uno_org_id
  FROM organizations
  WHERE slug = 'uno-electromedicina' OR nombre ILIKE '%uno electromedicina%'
  LIMIT 1;

  IF uno_org_id IS NULL THEN
    RAISE NOTICE 'No se encontro Uno Electromedicina, skippeando merge';
    RETURN;
  END IF;

  -- Tecnicos
  INSERT INTO servicio_tecnicos (org_id, nombre, activo, orden)
  SELECT uno_org_id, TRIM(nombre), activo, orden
  FROM servicios_configuracion
  WHERE tipo = 'tecnico'
    AND TRIM(nombre) <> ''
  ON CONFLICT (org_id, nombre) DO UPDATE
    SET activo = EXCLUDED.activo OR servicio_tecnicos.activo,
        orden = COALESCE(EXCLUDED.orden, servicio_tecnicos.orden);

  -- Tipos de servicio
  INSERT INTO servicio_tipos (org_id, nombre, activo, orden)
  SELECT uno_org_id, TRIM(nombre), activo, orden
  FROM servicios_configuracion
  WHERE tipo = 'tipo_servicio'
    AND TRIM(nombre) <> ''
  ON CONFLICT (org_id, nombre) DO UPDATE
    SET activo = EXCLUDED.activo OR servicio_tipos.activo,
        orden = COALESCE(EXCLUDED.orden, servicio_tipos.orden);

  -- Estados contables (por las dudas, aunque normalmente servicios_configuracion
  -- no guarda estos — los estados contables tradicionalmente se guardaban como
  -- TEXT libre en servicios.estado_contable)
  INSERT INTO servicio_estados_contables (org_id, nombre, activo, orden)
  SELECT uno_org_id, TRIM(nombre), activo, orden
  FROM servicios_configuracion
  WHERE tipo = 'estado_contable'
    AND TRIM(nombre) <> ''
  ON CONFLICT (org_id, nombre) DO UPDATE
    SET activo = EXCLUDED.activo OR servicio_estados_contables.activo,
        orden = COALESCE(EXCLUDED.orden, servicio_estados_contables.orden);
END $$;
